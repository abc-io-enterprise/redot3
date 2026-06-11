"""
Sign language translator.
Provides mock implementations using deep learning stubs.
Accepts image/video URLs for sign-to-text.
"""


def sign_to_text(image_url=None, image_base64=None, language='asl'):
    """
    Convert sign language image/video to text.

    Args:
        image_url: URL to image or video file.
        image_base64: Base64-encoded image data.
        language: Sign language code (default 'asl').

    Returns:
        Dict with keys: text, confidence, note, detected_gestures, model, language.
    """
    raw_input = image_url or image_base64
    if not raw_input or not isinstance(raw_input, str):
        return {
            "text": "",
            "confidence": 0.0,
            "note": "Invalid input URL",
            "detected_gestures": [],
            "model": "stub-v1.0",
            "language": language,
        }

    gestures = ["hello", "thank you", "please", "yes", "no", "help"]
    idx = len(raw_input) % len(gestures)
    detected = [gestures[idx]]

    return {
        "text": f"{detected[0].capitalize()} [sign language]",
        "confidence": round(0.75 + (len(raw_input) % 20) / 100, 2),
        "note": (
            "Mock sign language recognition. Integrate with MediaPipe Holistic, "
            "OpenPose, or a custom deep learning model for production use."
        ),
        "detected_gestures": detected,
        "model": "stub-v1.0",
        "language": language,
    }


def text_to_sign(text, language='asl'):
    """
    Convert text to sign language representation.

    Args:
        text: Input text string.
        language: Sign language code (default 'asl').

    Returns:
        Dict with keys: sequence, note, total_gestures, language.
    """
    if not text:
        return {
            "sequence": [],
            "note": "Empty input",
            "total_gestures": 0,
            "language": language,
        }

    words = text.lower().split()
    sequence = []
    for word in words:
        sequence.append(
            {
                "word": word,
                "gesture_id": f"gesture_{word[:10]}",
                "handshape": "open_b",
                "movement": "circular",
            }
        )

    return {
        "sequence": sequence,
        "note": (
            "Mock sign language sequence. Integrate with an avatar generation "
            "system for production use."
        ),
        "total_gestures": len(sequence),
        "language": language,
    }
