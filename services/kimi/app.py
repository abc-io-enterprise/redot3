import os
import requests
from flask import Flask, jsonify, request

app = Flask(__name__)

MISTRAL_API_KEY = os.getenv('MISTRAL_API_KEY')
MISTRAL_MODEL = os.getenv('MISTRAL_MODEL', 'mistral-pro')
MISTRAL_API_BASE_URL = os.getenv('MISTRAL_API_BASE_URL', '')


def mistral_headers():
    if not MISTRAL_API_KEY:
        raise RuntimeError('MISTRAL_API_KEY is not configured')
    return {
        'Authorization': f'Bearer {MISTRAL_API_KEY}',
        'Content-Type': 'application/json'
    }


def call_mistral(prompt, image_url=None, temperature=0.7, max_tokens=512):
    if not MISTRAL_API_KEY or not MISTRAL_API_BASE_URL:
        return {
            'output': [
                {
                    'type': 'text',
                    'text': f'Offline fallback response for prompt: {prompt[:120]}',
                }
            ],
            'fallback': True,
            'message': 'Mistral is not configured; using offline response.'
        }

    payload = {
        'input': prompt,
        'temperature': temperature,
        'max_output_tokens': max_tokens
    }
    if image_url:
        payload['image_url'] = image_url

    endpoint = f'{MISTRAL_API_BASE_URL}/generation/{MISTRAL_MODEL}/outputs'
    response = requests.post(endpoint, json=payload, headers=mistral_headers(), timeout=30)
    response.raise_for_status()
    return response.json()


@app.route('/')
def root():
    return jsonify({
        'service': 'kimi',
        'status': 'online',
        'model': request.environ.get('MODEL', 'default'),
        'mistral_enabled': bool(MISTRAL_API_KEY),
        'mistral_model': MISTRAL_MODEL
    })


@app.route('/health')
def health():
    return jsonify({
        'status': 'ok',
        'service': 'kimi',
        'mistral_enabled': bool(MISTRAL_API_KEY)
    })


@app.route('/ai/generate', methods=['POST'])
def generate_ai():
    data = request.get_json(silent=True) or {}
    prompt = data.get('prompt')
    if not prompt:
        return jsonify({'error': 'prompt is required'}), 400

    image_url = data.get('image_url')
    temperature = float(data.get('temperature', 0.7))

    try:
        result = call_mistral(prompt, image_url=image_url, temperature=temperature)
        return jsonify({
            'status': 'ok',
            'provider': 'mistral',
            'model': MISTRAL_MODEL,
            'result': result
        })
    except Exception as exc:
        return jsonify({
            'error': 'Mistral request failed',
            'details': str(exc)
        }), 502


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
