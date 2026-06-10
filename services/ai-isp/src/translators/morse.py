"""Morse code translation per ITU-R standards."""

MORSE_CODE_DICT = {
    'a': '.-', 'b': '-...', 'c': '-.-.', 'd': '-..', 'e': '.', 'f': '..-.',
    'g': '--.', 'h': '....', 'i': '..', 'j': '.---', 'k': '-.-', 'l': '.-..',
    'm': '--', 'n': '-.', 'o': '---', 'p': '.--.', 'q': '--.-', 'r': '.-.',
    's': '...', 't': '-', 'u': '..-', 'v': '...-', 'w': '.--', 'x': '-..-',
    'y': '-.--', 'z': '--..',
    '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
    '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', '-': '-....-',
    '/': '-..-.', '@': '.--.-.', '(': '-.--.', ')': '-.--.-',
    ' ': '/'  # word separator
}

REVERSE_MORSE = {v: k for k, v in MORSE_CODE_DICT.items()}

# Standard timing: dot=1 unit, dash=3 units, intra-char=1, inter-char=3, word=7
DOT_MS = 100
DASH_MS = 300
INTRA_MS = 100
INTER_MS = 300


def text_to_morse(text: str) -> str:
    """Convert text to Morse code string."""
    result = []
    for ch in text.lower():
        result.append(MORSE_CODE_DICT.get(ch, ch))
    return ' '.join(result)


def morse_to_text(morse: str) -> str:
    """Convert Morse code string back to text."""
    words = morse.strip().split(' / ')
    decoded_words = []
    for word in words:
        chars = word.split()
        decoded = ''.join(REVERSE_MORSE.get(c, c) for c in chars)
        decoded_words.append(decoded)
    return ' '.join(decoded_words)


def text_to_morse_timing(text: str) -> list:
    """Convert text to Morse timing sequence for haptic/signal devices.
    Returns list of {symbol, duration_ms}.
    """
    sequence = []
    words = text.lower().split(' ')
    for wi, word in enumerate(words):
        for ci, ch in enumerate(word):
            code = MORSE_CODE_DICT.get(ch, '')
            if code == '/':
                continue
            for si, symbol in enumerate(code):
                sequence.append({
                    'symbol': symbol,
                    'duration_ms': DOT_MS if symbol == '.' else DASH_MS,
                    'type': 'mark'
                })
                if si < len(code) - 1:
                    sequence.append({'symbol': 'gap', 'duration_ms': INTRA_MS, 'type': 'space'})
            if ci < len(word) - 1:
                sequence.append({'symbol': 'gap', 'duration_ms': INTER_MS, 'type': 'space'})
        if wi < len(words) - 1:
            sequence.append({'symbol': 'word_gap', 'duration_ms': INTER_MS * 2 + INTER_MS, 'type': 'space'})
    return sequence
