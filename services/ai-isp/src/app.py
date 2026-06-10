"""ABC-IO Cross-Sensory Translation Engine (5x5x25 Matrix)."""

import os
from flask import Flask, jsonify, request

from translators.braille import text_to_braille, braille_to_text
from translators.morse import text_to_morse, morse_to_text, text_to_morse_timing
from translators.haptic import text_to_haptic, text_to_morse_haptic
from translators.speech import speech_to_text, text_to_speech
from translators.sign import sign_to_text, text_to_sign

app = Flask(__name__)

# 5 senses x 5 protocols x 25 translation paths
SENSES = ['vision', 'hearing', 'touch', 'speech', 'gesture']
PROTOCOLS = ['text', 'braille', 'morse', 'haptic', 'audio']

MATRIX_PATHS = []
for s_in in SENSES:
    for p_out in PROTOCOLS:
        for s_out in SENSES:
            if s_in != s_out:
                MATRIX_PATHS.append(f"{s_in}:{p_out}:{s_out}")


def translate(input_modality: str, output_modality: str, content: str, options: dict = None) -> dict:
    """Route content through the appropriate translation pipeline."""
    options = options or {}
    
    # speech -> text
    if input_modality == 'speech' and output_modality == 'text':
        return speech_to_text(audio_url=content, language=options.get('language', 'en'))
    
    # text -> braille
    if input_modality == 'text' and output_modality == 'braille':
        return {'output': text_to_braille(content), 'modality': 'braille', 'type': 'unicode'}
    
    # braille -> text
    if input_modality == 'braille' and output_modality == 'text':
        return {'output': braille_to_text(content), 'modality': 'text', 'type': 'plain'}
    
    # text -> morse
    if input_modality == 'text' and output_modality == 'morse':
        return {
            'output': text_to_morse(content),
            'timing': text_to_morse_timing(content),
            'modality': 'morse',
            'type': 'itu-r'
        }
    
    # morse -> text
    if input_modality == 'morse' and output_modality == 'text':
        return {'output': morse_to_text(content), 'modality': 'text', 'type': 'plain'}
    
    # text -> haptic
    if input_modality == 'text' and output_modality == 'haptic':
        pattern_type = options.get('pattern_type', 'alphabet')
        if pattern_type == 'morse':
            return {'output': text_to_morse_haptic(content), 'modality': 'haptic', 'type': 'morse'}
        return {'output': text_to_haptic(content), 'modality': 'haptic', 'type': 'alphabet'}
    
    # sign -> text
    if input_modality == 'sign' and output_modality == 'text':
        return sign_to_text(image_url=content, language=options.get('language', 'asl'))
    
    # text -> sign
    if input_modality == 'text' and output_modality == 'sign':
        return text_to_sign(content, language=options.get('language', 'asl'))
    
    # text -> speech (TTS)
    if input_modality == 'text' and output_modality == 'speech':
        return text_to_speech(content, voice=options.get('voice', 'neutral'))
    
    # Default: pass-through with note
    return {
        'output': content,
        'modality': output_modality,
        'note': f'Direct pass-through: {input_modality} -> {output_modality}. Full pipeline pending.'
    }


@app.route('/')
def root():
    return jsonify({
        'service': 'ai-isp',
        'name': 'ABC-IO Cross-Sensory Translation Engine',
        'version': '2.0.0',
        'matrix': '5x5x25',
        'status': 'online'
    })


@app.route('/health')
def health():
    return jsonify({
        'status': 'ok',
        'service': 'ai-isp',
        'matrix_paths': len(MATRIX_PATHS)
    })


@app.route('/api/v1/matrix')
def matrix_info():
    return jsonify({
        'senses': SENSES,
        'protocols': PROTOCOLS,
        'total_paths': len(MATRIX_PATHS),
        'paths': MATRIX_PATHS[:25] + (['...'] if len(MATRIX_PATHS) > 25 else [])
    })


@app.route('/api/v1/translate/speech-to-text', methods=['POST'])
def api_speech_to_text():
    data = request.get_json(silent=True) or {}
    audio_url = data.get('audio_url')
    audio_base64 = data.get('audio_base64')
    language = data.get('language', 'en')
    
    if not audio_url and not audio_base64:
        return jsonify({'error': 'audio_url or audio_base64 required'}), 400
    
    result = speech_to_text(audio_url=audio_url, audio_base64=audio_base64, language=language)
    return jsonify({'status': 'ok', 'translation': result})


@app.route('/api/v1/translate/text-to-braille', methods=['POST'])
def api_text_to_braille():
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    if not text:
        return jsonify({'error': 'text required'}), 400
    
    result = text_to_braille(text)
    return jsonify({
        'status': 'ok',
        'input': text,
        'output': result,
        'modality': 'braille',
        'length': len(result)
    })


@app.route('/api/v1/translate/text-to-morse', methods=['POST'])
def api_text_to_morse():
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    if not text:
        return jsonify({'error': 'text required'}), 400
    
    result = text_to_morse(text)
    timing = text_to_morse_timing(text)
    return jsonify({
        'status': 'ok',
        'input': text,
        'output': result,
        'timing_sequence': timing,
        'modality': 'morse',
        'standard': 'itu-r'
    })


@app.route('/api/v1/translate/text-to-haptic', methods=['POST'])
def api_text_to_haptic():
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    pattern_type = data.get('pattern_type', 'alphabet')
    if not text:
        return jsonify({'error': 'text required'}), 400
    
    if pattern_type == 'morse':
        result = text_to_morse_haptic(text)
    else:
        result = text_to_haptic(text)
    
    return jsonify({
        'status': 'ok',
        'input': text,
        'output': result,
        'modality': 'haptic',
        'pattern_type': pattern_type,
        'device_compatibility': ['android_haptic', 'ios_corehaptics', 'wearable_tactile']
    })


@app.route('/api/v1/translate/sign-to-text', methods=['POST'])
def api_sign_to_text():
    data = request.get_json(silent=True) or {}
    image_url = data.get('image_url')
    image_base64 = data.get('image_base64')
    language = data.get('language', 'asl')
    
    if not image_url and not image_base64:
        return jsonify({'error': 'image_url or image_base64 required'}), 400
    
    result = sign_to_text(image_url=image_url, image_base64=image_base64, language=language)
    return jsonify({'status': 'ok', 'translation': result})


@app.route('/api/v1/translate/universal', methods=['POST'])
def api_universal():
    data = request.get_json(silent=True) or {}
    input_modality = data.get('input_modality')
    output_modality = data.get('output_modality')
    content = data.get('content')
    options = data.get('options', {})
    
    valid_modalities = {'speech', 'text', 'braille', 'morse', 'haptic', 'sign'}
    
    if input_modality not in valid_modalities:
        return jsonify({'error': f'input_modality must be one of: {valid_modalities}'}), 400
    if output_modality not in valid_modalities:
        return jsonify({'error': f'output_modality must be one of: {valid_modalities}'}), 400
    if content is None:
        return jsonify({'error': 'content required'}), 400
    
    result = translate(input_modality, output_modality, content, options)
    return jsonify({
        'status': 'ok',
        'input_modality': input_modality,
        'output_modality': output_modality,
        'result': result
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 7000)))
