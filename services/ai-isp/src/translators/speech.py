"""
Speech-to-text and text-to-speech translator.
Provides mock implementations that integrate with
Whisper / Mistral STT for production use.
"""

import base64
import re


def speech_to_text(audio_input):
    """
    Convert speech audio to text.

    Args:
        audio_input: Either a URL string or base64-encoded audio data.

    Returns:
        Dict with keys: text, confidence, note, input_type, duration_seconds.
    """
    input_type = "unknown"
    if isinstance(audio_input, str):
        if audio_input.startswith(("http://", "https://")):
            input_type = "url"
        elif re.match(r"^[A-Za-z0-9+/=]+$", audio_input) and len(audio_input) > 100:
            input_type = "base64"

    return {
        "text": "This is a mock transcription of the provided audio input.",
        "confidence": 0.92,
        "note": (
            "Mock STT result. Integrate with OpenAI Whisper or Mistral STT "
            "for production-quality transcription."
        ),
        "input_type": input_type,
        "duration_seconds": 3.5,
    }


def text_to_speech(text):
    """
    Convert text to speech audio.

    Args:
        text: Input text string.

    Returns:
        Dict with keys: audio_base64, format, note, duration_seconds.
    """
    mock_audio = base64.b64encode(f"mock_audio_for:{text}".encode()).decode()

    return {
        "audio_base64": mock_audio,
        "format": "audio/wav",
        "note": (
            "Mock TTS result. Integrate with a production TTS service "
            "(e.g., ElevenLabs, Azure TTS) for real speech synthesis."
        ),
        "duration_seconds": len(text.split()) * 0.5,
    }
