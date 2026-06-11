#!/usr/bin/env python3
"""Generate ABC-IO v5.0.0 owner reference PDF from project documentation."""

import base64
import os
import sys
from datetime import datetime, timezone

import markdown
from xhtml2pdf import pisa

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SECTIONS = [
    ("LIVE.txt", "LIVE.txt"),
    ("SYSTEM_DEFINITION.md", "System Definition"),
    ("FINAL_STATUS.md", "Final System Status"),
    ("OPERATIONAL_REPORT.md", "Operational Validation Report"),
    ("AUTONOMOUS_SYSTEM.md", "Autonomous Systems"),
    ("SHUTDOWN_CHECKLIST.md", "Shutdown / Handoff Checklist"),
    ("SIGN_OFF.md", "System Sign-Off"),
    ("FINAL_LIVE_CONFIRMATION.md", "Final Live Confirmation"),
    ("APK_VERIFICATION_REPORT.md", "APK Verification Report"),
    ("SOLUTIONS_AND_AUDIT.md", "Solutions & Live Audit"),
]

CSS = """
@page {
    size: letter;
    margin: 1in;
}
body {
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #1a1a1a;
}
h1 { font-size: 22pt; color: #1e3a5f; border-bottom: 2px solid #4a90e2; padding-bottom: 8px; margin-top: 0; }
h2 { font-size: 16pt; color: #1e3a5f; margin-top: 24px; border-bottom: 1px solid #d0d7de; padding-bottom: 4px; }
h3 { font-size: 13pt; color: #2c5282; margin-top: 18px; }
h4 { font-size: 12pt; color: #2d3748; }
pre, code {
    font-family: Consolas, "Courier New", monospace;
    background: #f6f8fa;
    font-size: 9.5pt;
}
pre { padding: 10px; border-radius: 6px; overflow-wrap: break-word; white-space: pre-wrap; }
code { padding: 2px 4px; border-radius: 3px; }
table {
    border-collapse: collapse;
    width: 100%;
    margin: 12px 0;
    font-size: 10pt;
}
th, td {
    border: 1px solid #d0d7de;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
}
th { background: #f6f8fa; font-weight: 600; }
tr:nth-child(even) { background: #fafbfc; }
ul, ol { margin: 8px 0; padding-left: 24px; }
li { margin: 3px 0; }
blockquote {
    border-left: 4px solid #4a90e2;
    margin: 12px 0;
    padding: 8px 16px;
    background: #f0f7ff;
    color: #1e3a5f;
}
a { color: #0366d6; text-decoration: none; }
.cover {
    text-align: center;
    padding-top: 120px;
}
.cover h1 { font-size: 32pt; border: none; color: #1e3a5f; }
.cover .subtitle { font-size: 16pt; color: #4a5568; margin-top: 12px; }
.cover .meta { font-size: 12pt; color: #718096; margin-top: 60px; }
.cover img { max-width: 180px; margin-bottom: 40px; }
.section-title { font-size: 20pt; color: #1e3a5f; margin: 30px 0 16px; border-bottom: 2px solid #4a90e2; padding-bottom: 6px; }
hr { border: none; border-top: 1px solid #e1e4e8; margin: 24px 0; }
"""


def logo_b64():
    with open(os.path.join(ROOT, "abc-io_logo.png"), "rb") as f:
        return base64.b64encode(f.read()).decode("ascii")


def md_to_html(path):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    return markdown.markdown(
        text,
        extensions=["tables", "fenced_code", "toc", "nl2br"],
    )


def main():
    os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
    output_path = os.path.join(ROOT, "ABC-IO_v5.0.0_Owner_Reference.pdf")

    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    html_parts = [
        "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>",
        CSS,
        "</style></head><body>",
        '<div class="cover">',
        f'<img src="data:image/png;base64,{logo_b64()}" alt="ABC-IO Logo">',
        "<h1>ABC-IO v5.0.0</h1>",
        '<div class="subtitle">Owner Reference &amp; Live Operations Manual</div>',
        f'<div class="meta">Owner: Christopher Porreca / redot1<br>Domain: https://abc-io.com<br>Generated: {generated}<br>Version: v5.0.0</div>',
        "</div>",
        "<div style=\"page-break-after: always;\"></div>",
    ]

    for filename, title in SECTIONS:
        filepath = os.path.join(ROOT, filename)
        if not os.path.exists(filepath):
            print(f"Warning: {filepath} not found, skipping.", file=sys.stderr)
            continue
        html_parts.append(f'<h1 class="section-title">{title}</h1>')
        html_parts.append(md_to_html(filepath))
        html_parts.append('<div style="page-break-after: always;"></div>')

    html_parts.append("</body></html>")
    html = "\n".join(html_parts)

    with open(output_path, "wb") as f:
        status = pisa.CreatePDF(html, dest=f)

    if status.err:
        print(f"PDF generation completed with {status.err} errors.", file=sys.stderr)
        sys.exit(1)

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"Generated: {output_path} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    main()
