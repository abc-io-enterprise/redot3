import os
import requests
from flask import Flask, jsonify, request

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
KIMI_API_BASE_URL = os.getenv('KIMI_API_BASE_URL', 'https://api.moonshot.cn/v1')


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


def call_mistral(prompt, image_url=None, temperature=0.7, max_tokens=512):
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
    response = requests.post(endpoint, json=payload, headers=mistral_headers(), timeout=30)
    response.raise_for_status()
    data = response.json()
    return {
        'output': [{'type': 'text', 'text': data['choices'][0]['message']['content']}],
        'usage': data.get('usage', {}),
        'provider': 'mistral',
        'model': MISTRAL_MODEL
    }


def call_kimi(prompt, image_url=None, temperature=0.7, max_tokens=512):
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
    response = requests.post(endpoint, json=payload, headers=kimi_headers(), timeout=30)
    response.raise_for_status()
    data = response.json()
    return {
        'output': [{'type': 'text', 'text': data['choices'][0]['message']['content']}],
        'usage': data.get('usage', {}),
        'provider': 'kimi',
        'model': KIMI_MODEL
    }


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
        'kimi_model': KIMI_MODEL
    })


@app.route('/health')
def health():
    return jsonify({
        'status': 'ok',
        'service': 'kimi',
        'provider': AI_PROVIDER,
        'mistral_enabled': bool(MISTRAL_API_KEY),
        'kimi_enabled': bool(KIMI_API_KEY)
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
            'result': result
        })
    except Exception as exc:
        return jsonify({
            'error': f'{AI_PROVIDER.title()} request failed',
            'details': str(exc)
        }), 502


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
