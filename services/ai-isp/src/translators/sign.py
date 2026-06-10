"""
Sign language translator.
Provides mock implementations using deep learning stubs.
Accepts image/video URLs for sign-to-text.
"""


def sign_to_text(image_url):
    """
    Convert sign language image/video to text.

    Args:
        image_url: URL to image or video file.

    Returns:
        Dict with keys: text, confidence, note, detected_gestures, model.
    """
    if not image_url or not isinstance(image_url, str):
        return {
            "text": "",
            "confidence": 0.0,
            "note": "Invalid input URL",
            "detected_gestures": [],
            "model": "stub-v1.0",
        }

    gestures = ["hello", "thank you", "please", "yes", "no", "help"]
    idx = len(image_url) % len(gestures)
    detected = [gestures[idx]]

    return {
        "text": f"{detected[0].capitalize()} [sign language]",
        "confidence": round(0.75 + (len(image_url) % 20) / 100, 2),
        "note": (
            "Mock sign language recognition. Integrate with MediaPipe Holistic, "
            "OpenPose, or a custom deep learning model for production use."
        ),
        "detected_gestures": detected,
        "model": "stub-v1.0",
    }


def text_to_sign(text):
    """
    Convert text to sign language representation.

    Args:
        text: Input text string.

    Returns:
        Dict with keys: sequence, note, total_gestures.
    """
    if not text:
        return {
            "sequence": [],
            "note": "Empty input",
            "total_gestures": 0,
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
    }
