import os
import time
import hashlib
import functools
from datetime import datetime, timedelta
from flask import Flask, jsonify, request

import requests

app = Flask(__name__)

# Provider selection: 'mistral' (production/cheaper) or 'kimi' (development)
AI_PROVIDER = os.getenv('AI_PROVIDER', 'mistral').lower()

# Mistral configuration (production — cheaper for startup)
MISTRAL_API_KEY = os.getenv('MISTRAL_API_KEY')
MISTRAL_MODEL = os.getenv('MISTRAL_MODEL', 'mistral-small-latest')
MISTRAL_API_BASE_URL = os.getenv('MISTRAL_API_BASE_URL', 'https://api.mistral.ai/v1')

# Kimi configuration (development / permanent local system)
KIMI_API_KEY = os.getenv('KIMI_API_KEY')
KIMI_MODEL = os.getenv('KIMI_MODEL', 'kimi-latest')
KIMI_API_BASE_URL = os.getenv('KIMI_API_BASE_URL', 'https://api.kimi.ai/v1')

# ============ CIRCUIT BREAKER ============
class CircuitBreaker:
    """Simple circuit breaker for external API calls."""
    def __init__(self, failure_threshold=3, recovery_timeout=60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.last_failure_time = None
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN

    def call(self, fn, *args, **kwargs):
        if self.state == 'OPEN':
            if self.last_failure_time and (time.time() - self.last_failure_time) > self.recovery_timeout:
                self.state = 'HALF_OPEN'
            else:
                raise RuntimeError(f'Circuit breaker OPEN for {fn.__name__}')

        try:
            result = fn(*args, **kwargs)
            if self.state == 'HALF_OPEN':
                self.state = 'CLOSED'
                self.failures = 0
            return result
        except Exception as e:
            self.failures += 1
            self.last_failure_time = time.time()
            if self.failures >= self.failure_threshold:
                self.state = 'OPEN'
            raise e

mistral_breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=60)
kimi_breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=60)

# ============ RESPONSE CACHE ============
_response_cache = {}
_cache_ttl = 300  # 5 minutes

def _cache_key(prompt, provider, model, max_tokens):
    raw = f"{provider}:{model}:{max_tokens}:{prompt}"
    return hashlib.sha256(raw.encode()).hexdigest()

def _get_cached(key):
    entry = _response_cache.get(key)
    if not entry:
        return None
    if datetime.utcnow() > entry['expires']:
        del _response_cache[key]
        return None
    return entry['data']

def _set_cached(key, data):
    _response_cache[key] = {
        'data': data,
        'expires': datetime.utcnow() + timedelta(seconds=_cache_ttl)
    }

# ============ RETRY DECORATOR ============
def retry_with_backoff(max_retries=3, base_delay=1.0):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return fn(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        delay = base_delay * (2 ** attempt)
                        time.sleep(delay)
            raise last_exception
        return wrapper
    return decorator

# ============ API CLIENTS ============
def mistral_headers():
    if not MISTRAL_API_KEY:
        raise RuntimeError('MISTRAL_API_KEY is not configured')
    return {
        'Authorization': f'Bearer {MISTRAL_API_KEY}',
        'Content-Type': 'application/json'
    }


def kimi_headers():
    if not KIMI_API_KEY:
        raise RuntimeError('KIMI_API_KEY is not configured')
    return {
        'Authorization': f'Bearer {KIMI_API_KEY}',
        'Content-Type': 'application/json'
    }


@retry_with_backoff(max_retries=3, base_delay=1.0)
def _post_with_retry(endpoint, payload, headers, timeout=30):
    response = requests.post(endpoint, json=payload, headers=headers, timeout=timeout)
    response.raise_for_status()
    return response.json()


def call_mistral(prompt, image_url=None, temperature=0.7, max_tokens=512):
    cache_key = _cache_key(prompt, 'mistral', MISTRAL_MODEL, max_tokens)
    cached = _get_cached(cache_key)
    if cached:
        cached['cached'] = True
        return cached

    messages = [{'role': 'user', 'content': prompt}]
    if image_url:
        messages[0]['content'] = [
            {'type': 'text', 'text': prompt},
            {'type': 'image_url', 'image_url': {'url': image_url}}
        ]

    payload = {
        'model': MISTRAL_MODEL,
        'messages': messages,
        'temperature': temperature,
        'max_tokens': max_tokens
    }

    endpoint = f'{MISTRAL_API_BASE_URL}/chat/completions'

    def _do_call():
        return _post_with_retry(endpoint, payload, mistral_headers())

    data = mistral_breaker.call(_do_call)

    result = {
        'output': [{'type': 'text', 'text': data['choices'][0]['message']['content']}],
        'usage': data.get('usage', {}),
        'provider': 'mistral',
        'model': MISTRAL_MODEL,
        'cached': False
    }
    _set_cached(cache_key, result)
    return result


def call_kimi(prompt, image_url=None, temperature=0.7, max_tokens=512):
    cache_key = _cache_key(prompt, 'kimi', KIMI_MODEL, max_tokens)
    cached = _get_cached(cache_key)
    if cached:
        cached['cached'] = True
        return cached

    messages = [{'role': 'user', 'content': prompt}]
    if image_url:
        messages[0]['content'] = [
            {'type': 'text', 'text': prompt},
            {'type': 'image_url', 'image_url': {'url': image_url}}
        ]

    payload = {
        'model': KIMI_MODEL,
        'messages': messages,
        'temperature': temperature,
        'max_tokens': max_tokens
    }

    endpoint = f'{KIMI_API_BASE_URL}/chat/completions'

    def _do_call():
        return _post_with_retry(endpoint, payload, kimi_headers())

    data = kimi_breaker.call(_do_call)

    result = {
        'output': [{'type': 'text', 'text': data['choices'][0]['message']['content']}],
        'usage': data.get('usage', {}),
        'provider': 'kimi',
        'model': KIMI_MODEL,
        'cached': False
    }
    _set_cached(cache_key, result)
    return result


def generate_ai_response(prompt, image_url=None, temperature=0.7, max_tokens=512):
    if AI_PROVIDER == 'kimi' and KIMI_API_KEY and KIMI_API_BASE_URL:
        return call_kimi(prompt, image_url=image_url, temperature=temperature, max_tokens=max_tokens)
    elif MISTRAL_API_KEY and MISTRAL_API_BASE_URL:
        return call_mistral(prompt, image_url=image_url, temperature=temperature, max_tokens=max_tokens)
    else:
        return {
            'output': [{'type': 'text', 'text': f'Offline fallback response for prompt: {prompt[:120]}'}],
            'fallback': True,
            'message': 'No AI provider configured; using offline response.',
            'provider': 'offline'
        }


@app.route('/')
def root():
    return jsonify({
        'service': 'kimi',
        'status': 'online',
        'provider': AI_PROVIDER,
        'mistral_enabled': bool(MISTRAL_API_KEY),
        'mistral_model': MISTRAL_MODEL,
        'kimi_enabled': bool(KIMI_API_KEY),
        'kimi_model': KIMI_MODEL,
        'circuit_breaker': {
            'mistral': mistral_breaker.state,
            'kimi': kimi_breaker.state
        }
    })


@app.route('/health')
def health():
    return jsonify({
        'status': 'ok',
        'service': 'kimi',
        'provider': AI_PROVIDER,
        'mistral_enabled': bool(MISTRAL_API_KEY),
        'kimi_enabled': bool(KIMI_API_KEY),
        'circuit_breaker': {
            'mistral': mistral_breaker.state,
            'kimi': kimi_breaker.state
        }
    })


@app.route('/ai/generate', methods=['POST'])
def generate_ai():
    data = request.get_json(silent=True) or {}
    prompt = data.get('prompt')
    if not prompt:
        return jsonify({'error': 'prompt is required'}), 400

    image_url = data.get('image_url')
    temperature = float(data.get('temperature', 0.7))
    max_tokens = int(data.get('max_tokens', 512))

    try:
        result = generate_ai_response(prompt, image_url=image_url, temperature=temperature, max_tokens=max_tokens)
        return jsonify({
            'status': 'ok',
            'provider': result.get('provider', AI_PROVIDER),
            'model': result.get('model', 'unknown'),
            'cached': result.get('cached', False),
            'result': result
        })
    except Exception as exc:
        return jsonify({
            'error': f'{AI_PROVIDER.title()} request failed',
            'details': str(exc),
            'circuit_breaker': {
                'mistral': mistral_breaker.state,
                'kimi': kimi_breaker.state
            }
        }), 502


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
