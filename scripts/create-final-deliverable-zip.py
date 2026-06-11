#!/usr/bin/env python3
"""Create the final owner deliverable ZIP in Documents."""

import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCUMENTS = os.path.dirname(ROOT)
OUTPUT = os.path.join(DOCUMENTS, "redot2-v5.final.zip")

FILES = [
    "ABC-IO_v5.0.0_Owner_Reference.pdf",
    "FINAL_LIVE_CONFIRMATION.md",
    "OPERATOR_STATUS_CONFIRMATION.md",
    "CLOUD_USB_TRANSFER_GUIDE.md",
    "APK_VERIFICATION_REPORT.md",
    "apk/redot2-operator.apk",
    "apk/redot2-operator.apk.idsig",
    "apk/redot2-latest.apk",
    "abc-io_logo_final.png",
    "favicon.ico",
]


def main():
    count = 0
    with zipfile.ZipFile(OUTPUT, "w", zipfile.ZIP_DEFLATED) as zf:
        for rel_path in FILES:
            full_path = os.path.join(ROOT, rel_path)
            if not os.path.exists(full_path):
                print(f"Warning: missing {full_path}")
                continue
            zf.write(full_path, arcname=os.path.basename(rel_path))
            count += 1

    size_mb = os.path.getsize(OUTPUT) / (1024 * 1024)
    print(f"Created: {OUTPUT}")
    print(f"Files: {count}")
    print(f"Size: {size_mb:.2f} MB")


if __name__ == "__main__":
    main()
