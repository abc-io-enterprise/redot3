"""
Haptic translator converting text to vibration pattern sequences.
Uses Morse code timing as the intermediate representation for text,
producing JSON arrays of {duration_ms, intensity_0_100}.
"""

from .morse import text_to_morse, morse_to_text

# ITU-R-derived timing for wearable haptics (values in milliseconds)
DOT_DURATION_MS = 200
DASH_DURATION_MS = 600
INTRA_CHAR_GAP_MS = 200   # gap between dots/dashes within one character
INTER_CHAR_GAP_MS = 600   # gap between characters
INTER_WORD_GAP_MS = 1400  # gap between words
INTENSITY = 80            # vibration intensity 0-100


def text_to_haptic(text):
    """
    Convert text to haptic vibration patterns.

    Args:
        text: Input text string.

    Returns:
        List of dicts with keys: duration_ms, intensity_0_100.
    """
    if not text:
        return []

    morse = text_to_morse(text)
    patterns = []

    words = morse.split(" / ")
    for w_idx, word in enumerate(words):
        letters = word.split()
        for l_idx, letter in enumerate(letters):
            for s_idx, symbol in enumerate(letter):
                if symbol == ".":
                    patterns.append({"duration_ms": DOT_DURATION_MS, "intensity_0_100": INTENSITY})
                elif symbol == "-":
                    patterns.append({"duration_ms": DASH_DURATION_MS, "intensity_0_100": INTENSITY})

                if s_idx < len(letter) - 1:
                    patterns.append({"duration_ms": INTRA_CHAR_GAP_MS, "intensity_0_100": 0})

            if l_idx < len(letters) - 1:
                patterns.append({"duration_ms": INTER_CHAR_GAP_MS, "intensity_0_100": 0})

        if w_idx < len(words) - 1:
            patterns.append({"duration_ms": INTER_WORD_GAP_MS, "intensity_0_100": 0})

    return patterns


# Alias for app.py compatibility
text_to_morse_haptic = text_to_haptic


def haptic_to_text(patterns):
    """
    Convert haptic vibration patterns back to text.

    Args:
        patterns: List of dicts with keys: duration_ms, intensity_0_100.

    Returns:
        Transcribed text string.
    """
    if not patterns:
        return ""

    morse_chars = []
    active_symbols = []

    for p in patterns:
        duration = p.get("duration_ms", 0)
        intensity = p.get("intensity_0_100", 0)

        if intensity > 0:
            if duration <= 300:
                active_symbols.append(".")
            else:
                active_symbols.append("-")
        else:
            if duration >= 1000:
                # Inter-word gap
                if active_symbols:
                    morse_chars.append("".join(active_symbols))
                    active_symbols = []
                morse_chars.append("/")
            elif duration >= 400:
                # Inter-character gap
                if active_symbols:
                    morse_chars.append("".join(active_symbols))
                    active_symbols = []
            # Short gaps are intra-character and ignored

    if active_symbols:
        morse_chars.append("".join(active_symbols))

    morse_str = " ".join(morse_chars)
    return morse_to_text(morse_str)
