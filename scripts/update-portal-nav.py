#!/usr/bin/env python3
"""Add Mobile App link to public portal navigation."""

import os
import re

PUBLIC_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "services", "public-portal", "src", "public"
)

PATTERN = re.compile(
    r'(<a href="/help\.html">Help</a>\s*)\n(\s*)(<a href="/dashboard\.html">Dashboard</a>)',
    re.MULTILINE
)

REPLACEMENT = r'\1\n\2<a href="/mobile-app.html">Mobile App</a>\n\2\3'


def main():
    updated = 0
    for filename in os.listdir(PUBLIC_DIR):
        if not filename.endswith(".html"):
            continue
        path = os.path.join(PUBLIC_DIR, filename)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        new_content, count = PATTERN.subn(REPLACEMENT, content)
        if count:
            with open(path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Updated {filename}")
            updated += 1
    print(f"Total updated: {updated}")


if __name__ == "__main__":
    main()
