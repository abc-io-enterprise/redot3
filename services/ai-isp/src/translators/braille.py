"""
Braille translator using Unicode braille patterns (U+2800–U+28FF).
Implements Grade 1 (uncontracted) English Braille.
"""

# Dot to bit mapping per Unicode:
# Dot 1 = bit 0, Dot 2 = bit 1, Dot 3 = bit 2,
# Dot 4 = bit 3, Dot 5 = bit 4, Dot 6 = bit 5
DOT_BITS = {
    1: 1 << 0,
    2: 1 << 1,
    3: 1 << 2,
    4: 1 << 3,
    5: 1 << 4,
    6: 1 << 5,
}

_LETTER_TO_DOTS = {
    "a": [1],
    "b": [1, 2],
    "c": [1, 4],
    "d": [1, 4, 5],
    "e": [1, 5],
    "f": [1, 2, 4],
    "g": [1, 2, 4, 5],
    "h": [1, 2, 5],
    "i": [2, 4],
    "j": [2, 4, 5],
    "k": [1, 3],
    "l": [1, 2, 3],
    "m": [1, 3, 4],
    "n": [1, 3, 4, 5],
    "o": [1, 3, 5],
    "p": [1, 2, 3, 4],
    "q": [1, 2, 3, 4, 5],
    "r": [1, 2, 3, 5],
    "s": [2, 3, 4],
    "t": [2, 3, 4, 5],
    "u": [1, 3, 6],
    "v": [1, 2, 3, 6],
    "w": [2, 4, 5, 6],
    "x": [1, 3, 4, 6],
    "y": [1, 3, 4, 5, 6],
    "z": [1, 3, 5, 6],
}

# Digits reuse a-j dot patterns; require number prefix (dots 3456)
_NUMBER_TO_DOTS = {
    "1": [1],
    "2": [1, 2],
    "3": [1, 4],
    "4": [1, 4, 5],
    "5": [1, 5],
    "6": [1, 2, 4],
    "7": [1, 2, 4, 5],
    "8": [1, 2, 5],
    "9": [2, 4],
    "0": [2, 4, 5],
}

_PUNCTUATION_TO_DOTS = {
    ",": [2],
    ";": [2, 3],
    ":": [2, 5],
    ".": [2, 5, 6],
    "?": [2, 3, 6],
    "!": [2, 3, 5],
    "'": [3],
    "-": [3, 6],
    '"': [2, 3, 5, 6],
    "(": [1, 2, 3, 5, 6],
    ")": [2, 3, 4, 5, 6],
    "/": [3, 4],
    "—": [3, 6],
}

# Prefix indicators
_NUMBER_SIGN = [3, 4, 5, 6]   # U+283C
_CAPITAL_SIGN = [4, 6]        # U+2828
_SPACE = []                   # U+2800


def _dots_to_unicode(dots):
    """Convert a list of dot numbers to a Unicode braille character."""
    offset = 0
    for d in dots:
        offset |= DOT_BITS[d]
    return chr(0x2800 + offset)


def _unicode_to_dots(char):
    """Convert a Unicode braille character to a list of dot numbers."""
    offset = ord(char) - 0x2800
    if offset < 0 or offset > 0xFF:
        return None
    dots = []
    for d in range(1, 7):
        if offset & DOT_BITS[d]:
            dots.append(d)
    return dots


def text_to_braille(text):
    """
    Convert text to Unicode braille patterns.

    Args:
        text: Input text string.

    Returns:
        String of Unicode braille characters.
    """
    if not text:
        return ""

    result = []
    number_mode = False

    for ch in text:
        if ch == " ":
            result.append(_dots_to_unicode(_SPACE))
            number_mode = False
            continue

        if ch.isdigit():
            if not number_mode:
                result.append(_dots_to_unicode(_NUMBER_SIGN))
                number_mode = True
            result.append(_dots_to_unicode(_NUMBER_TO_DOTS.get(ch, [])))
            continue

        if number_mode and ch.isalpha():
            number_mode = False

        if ch.isupper():
            result.append(_dots_to_unicode(_CAPITAL_SIGN))
            ch = ch.lower()

        if ch in _LETTER_TO_DOTS:
            result.append(_dots_to_unicode(_LETTER_TO_DOTS[ch]))
        elif ch in _PUNCTUATION_TO_DOTS:
            result.append(_dots_to_unicode(_PUNCTUATION_TO_DOTS[ch]))
        else:
            # Unknown character: render as blank cell
            result.append(_dots_to_unicode(_SPACE))

    return "".join(result)


def braille_to_text(braille):
    """
    Convert Unicode braille patterns to text.

    Args:
        braille: String of Unicode braille characters.

    Returns:
        Transcribed text string.
    """
    if not braille:
        return ""

    # Build reverse lookup tables
    unicode_to_letter = {_dots_to_unicode(dots): letter for letter, dots in _LETTER_TO_DOTS.items()}
    unicode_to_number = {_dots_to_unicode(dots): num for num, dots in _NUMBER_TO_DOTS.items()}
    unicode_to_punct = {_dots_to_unicode(dots): punct for punct, dots in _PUNCTUATION_TO_DOTS.items()}

    number_sign_char = _dots_to_unicode(_NUMBER_SIGN)
    capital_sign_char = _dots_to_unicode(_CAPITAL_SIGN)
    space_char = _dots_to_unicode(_SPACE)

    result = []
    number_mode = False
    capitalize_next = False

    for char in braille:
        if char == space_char:
            result.append(" ")
            number_mode = False
            continue

        if char == number_sign_char:
            number_mode = True
            continue

        if char == capital_sign_char:
            capitalize_next = True
            continue

        if number_mode and char in unicode_to_number:
            result.append(unicode_to_number[char])
            continue

        if char in unicode_to_letter:
            letter = unicode_to_letter[char]
            if capitalize_next:
                letter = letter.upper()
                capitalize_next = False
            result.append(letter)
            number_mode = False
        elif char in unicode_to_punct:
            result.append(unicode_to_punct[char])
            number_mode = False
        # Unknown pattern is silently skipped

    return "".join(result)
