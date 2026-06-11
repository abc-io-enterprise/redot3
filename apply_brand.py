#!/usr/bin/env python3
"""Apply shared brand.css, header, main wrapper, and footer to portal HTML files."""
import re
from pathlib import Path

HEADER = '''<header class="brand-header">
  <div class="header-inner">
    <a href="/" class="logo-link">
      <img src="/abc-io_logo.png" alt="ABC-IO" class="logo-img">
      <span class="brand-name">ABC-IO</span>
    </a>
    <nav>
      <a href="/">Home</a>
      <a href="/features.html">Features</a>
      <a href="/pricing.html">Pricing</a>
      <a href="/docs.html">API Docs</a>
      <a href="/help.html">Help</a>
      <a href="/dashboard.html">Dashboard</a>
    </nav>
  </div>
</header>'''

FOOTER = '''<footer class="brand-footer">
  <div class="footer-inner">
    <div>
      <h4>ABC-IO</h4>
      <p>Global Sensory Interface Communications Provider and AI Software ISP System.</p>
    </div>
    <div>
      <h4>Contact</h4>
      <p>Christopher Porreca / redot1</p>
      <p><a href="mailto:cporreca@abc-io.com">cporreca@abc-io.com</a></p>
      <p><a href="tel:585-629-9120">585-629-9120</a></p>
    </div>
    <div>
      <h4>Legal</h4>
      <p><a href="/privacy.html">Privacy Policy</a></p>
      <p><a href="/terms.html">Terms of Service</a></p>
    </div>
    <p class="copyright">&copy; 2026 ABC-IO by Christopher Porreca / redot1. All rights reserved. Private operational system.</p>
  </div>
</footer>'''

CSS_LINK = '<link rel="stylesheet" href="/brand.css">'


def add_css_link(text: str) -> str:
    if CSS_LINK in text:
        return text
    return re.sub(r'(</head>)', f'{CSS_LINK}\n$1', text, count=1, flags=re.IGNORECASE)


def add_body_header(text: str) -> str:
    if 'brand-header' in text:
        return text
    return re.sub(r'(<body[^>]*>)', r'\1\n' + HEADER, text, count=1, flags=re.IGNORECASE)


def wrap_content_in_main(text: str) -> str:
    if '<main>' in text:
        return text
    # Insert <main> right after the new brand-header
    text = re.sub(r'(</header>)(?=\s*)', r'\1\n<main>', text, count=1, flags=re.IGNORECASE)
    # Close </main> before the cookie banner or before the closing scripts/footer area
    cookie_match = re.search(r'\s*<div\s+id=["\']cookieBanner["\']', text, flags=re.IGNORECASE)
    if cookie_match:
        pos = cookie_match.start()
        text = text[:pos] + '\n</main>' + text[pos:]
    else:
        # fallback: before </body>
        text = re.sub(r'(</body>)', r'</main>\n$1', text, count=1, flags=re.IGNORECASE)
    return text


def add_footer_before_body_close(text: str) -> str:
    if 'brand-footer' in text:
        # if footer already exists, leave it (owner-dashboard case handled separately)
        pass
    return re.sub(r'(</body>)', f'{FOOTER}\n$1', text, count=1, flags=re.IGNORECASE)


def transform_public_portal(path: Path) -> bool:
    text = path.read_text(encoding='utf-8')
    if CSS_LINK in text and 'brand-header' in text and 'brand-footer' in text and '<main>' in text:
        return False

    # 1. CSS link
    text = add_css_link(text)
    # 2. Remove old inline nav header
    text = re.sub(r'<nav\s+class=["\']nav[^"\']*["\'][^>]*>.*?</nav>', '', text, count=1, flags=re.DOTALL | re.IGNORECASE)
    # 3. Remove old inline footer
    text = re.sub(r'<footer\s+class=["\']footer["\'][^>]*>.*?</footer>', '', text, count=1, flags=re.DOTALL | re.IGNORECASE)
    # 4. Add brand header after body
    text = add_body_header(text)
    # 5. Wrap page content in <main>
    text = wrap_content_in_main(text)
    # 6. Add footer before </body>
    text = add_footer_before_body_close(text)

    path.write_text(text, encoding='utf-8')
    return True


def transform_beacon_pwa(path: Path) -> bool:
    text = path.read_text(encoding='utf-8')
    if CSS_LINK in text and 'brand-header' in text:
        return False

    # CSS link
    text = add_css_link(text)
    # Remove old header
    text = re.sub(r'<header>.*?</header>', '', text, count=1, flags=re.DOTALL | re.IGNORECASE)
    # Add brand header
    text = add_body_header(text)
    # Preserve timestamp element
    ts_preserve = '<p style="text-align:right;color:var(--text-muted);margin:0 0 0.5rem 0"><small id="ts"></small></p>'
    # Wrap cards in <main>
    text = re.sub(r'(<div\s+class=["\']card["\'])', f'<main>\n{ts_preserve}\n\\1', text, count=1, flags=re.IGNORECASE)
    text = re.sub(r'(</div>)(\s*<script>)', r'</main>\n$2', text, count=1, flags=re.IGNORECASE)
    # Add footer before script (after </main>)
    text = re.sub(r'(</main>)(\s*<script>)', r'\1\n' + FOOTER + r'$2', text, count=1, flags=re.IGNORECASE)

    path.write_text(text, encoding='utf-8')
    return True


def transform_owner_dashboard(path: Path) -> bool:
    text = path.read_text(encoding='utf-8')
    if CSS_LINK in text and 'brand-header' in text:
        return False

    # CSS link
    text = add_css_link(text)
    # Remove old inline header
    text = re.sub(r'<header>.*?</header>', '', text, count=1, flags=re.DOTALL | re.IGNORECASE)
    # Add brand header after body
    text = add_body_header(text)
    # Wrap main-grid in <main>
    text = re.sub(r'<div\s+class=["\']main-grid["\']>', '<main class="main-grid">', text, count=1, flags=re.IGNORECASE)
    text = re.sub(r'</div>\s*</div>\s*(?=<script>)', '</main>\n  </div>\n\n  ', text, count=1, flags=re.IGNORECASE)
    # Re-insert dashboard status/auth bar as first card inside main
    status_card = '''<div class="card card-full" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
        <div><div class="status-badge status-online" id="overallStatus">● ONLINE</div></div>
        <div style="display:flex;gap:10px;align-items:center">
          <div class="user-info" id="userInfo">Not authenticated</div>
          <button class="btn-sm btn-primary" onclick="logout()">Logout</button>
        </div>
      </div>
'''
    text = re.sub(r'(<main class="main-grid">\s*)', r'\1\n      ' + status_card, text, count=1, flags=re.IGNORECASE)
    # Replace existing brand-footer with standard footer
    text = re.sub(r'<footer\s+class=["\']brand-footer["\'][^>]*>.*?</footer>', FOOTER, text, count=1, flags=re.DOTALL | re.IGNORECASE)
    # If no brand-footer existed, add before </body>
    if 'brand-footer' not in text:
        text = re.sub(r'(</body>)', f'{FOOTER}\n$1', text, count=1, flags=re.IGNORECASE)

    path.write_text(text, encoding='utf-8')
    return True


def main():
    updated = []

    public_dir = Path('services/public-portal/src/public')
    for html in sorted(public_dir.glob('*.html')):
        if transform_public_portal(html):
            updated.append(str(html))

    owner = Path('services/owner-dashboard/src/public/index.html')
    if transform_owner_dashboard(owner):
        updated.append(str(owner))

    beacon = Path('services/beacon-pwa/public/index.html')
    if transform_beacon_pwa(beacon):
        updated.append(str(beacon))

    print('Updated files:')
    for f in updated:
        print(f)


if __name__ == '__main__':
    main()
