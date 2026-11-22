#!/usr/bin/env python3
"""Sync the generator source into launcher HTML and build the local launcher."""

from __future__ import annotations

import argparse
import json
import platform
import re
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE_JS = ROOT / "subscription_data_studio.js"
SOURCE_HTML = ROOT / "subscription_data_studio.html"
RULES_SOURCE = ROOT / "subscription_data_studio_logic.md"
RULES_COPY = ROOT / "subscription_data_studio_logic.md"
EXAMPLE_GUIDE = ROOT / "EXAMPLE_PROJECT.md"
DICTIONARY_FILE = ROOT / "data_dictionary_definitions.js"
DEFAULT_INSTANCE_FILE = ROOT / "subscription_data_studio_instance.json"
WINDOWS_DIR = ROOT / "launchers" / "windows"
WINDOWS_HTML = WINDOWS_DIR / "subscription_data_studio.html"
MAC_DIR = ROOT / "launchers" / "mac"
MAC_APP_HTML = (
    MAC_DIR
    / "subscription_data_studio.app"
    / "Contents"
    / "Resources"
    / "subscription_data_studio.html"
)


def sync_sources() -> None:
    source = SOURCE_JS.read_text(encoding="utf-8")
    # The first line documents that the JavaScript file is the source of truth.
    if source.startswith("//"):
        source = source.split("\n", 1)[1]
    embedded = "<script>\n" + "\n".join(
        f"  {line}" if line else "" for line in source.rstrip().splitlines()
    ) + "\n  </script>"

    html = SOURCE_HTML.read_text(encoding="utf-8")
    html = re.sub(
        r"<script>window\.__SUBSCRIPTION_STUDIO_DEFAULTS__=.*?</script>",
        "<!-- DEFAULT_STUDIO_INSTANCE -->",
        html,
        count=1,
        flags=re.DOTALL,
    )
    updated, count = re.subn(
        r"<script>.*?</script>",
        lambda _match: embedded,
        html,
        count=1,
        flags=re.DOTALL,
    )
    if count != 1:
        raise RuntimeError(f"Expected one inline script in {SOURCE_HTML}")
    if DEFAULT_INSTANCE_FILE.exists():
        defaults = json.dumps(json.loads(DEFAULT_INSTANCE_FILE.read_text(encoding="utf-8")), separators=(",", ":")).replace("</", "<\\/")
        default_script = f"<script>window.__SUBSCRIPTION_STUDIO_DEFAULTS__={defaults};</script>"
        updated = updated.replace("<!-- DEFAULT_STUDIO_INSTANCE -->", default_script)

    SOURCE_HTML.write_text(updated, encoding="utf-8")
    WINDOWS_HTML.write_text(updated, encoding="utf-8")
    if RULES_SOURCE.exists():
        RULES_COPY.write_bytes(RULES_SOURCE.read_bytes())
        (WINDOWS_DIR / RULES_COPY.name).write_bytes(RULES_SOURCE.read_bytes())
    if EXAMPLE_GUIDE.exists():
        (WINDOWS_DIR / EXAMPLE_GUIDE.name).write_bytes(EXAMPLE_GUIDE.read_bytes())
    if DICTIONARY_FILE.exists():
        (WINDOWS_DIR / DICTIONARY_FILE.name).write_bytes(DICTIONARY_FILE.read_bytes())
        (MAC_DIR / DICTIONARY_FILE.name).write_bytes(DICTIONARY_FILE.read_bytes())
    print("Synchronized source JavaScript and Windows HTML launcher.")


def build_mac() -> None:
    subprocess.run(["sh", str(MAC_DIR / "build_mac_app.sh")], cwd=ROOT, check=True)


def build_windows() -> None:
    powershell = shutil.which("powershell") or shutil.which("pwsh")
    if not powershell:
        raise RuntimeError("PowerShell was not found; run this build on Windows.")
    subprocess.run(
        [
            powershell,
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(WINDOWS_DIR / "Build Windows EXE.ps1"),
        ],
        cwd=WINDOWS_DIR,
        check=True,
    )


def verify_copies(platform_name: str) -> None:
    canonical = SOURCE_HTML.read_bytes()
    if WINDOWS_HTML.read_bytes() != canonical:
        raise RuntimeError("Windows HTML does not match the standalone app.")
    if platform_name == "macOS" and MAC_APP_HTML.exists():
        mac_html = MAC_APP_HTML.read_text(encoding="utf-8").replace('src="../../../data_dictionary_definitions.js"', 'src="./data_dictionary_definitions.js"').encode("utf-8")
        if mac_html != canonical:
            raise RuntimeError("Packaged Mac HTML does not match the standalone app.")
    print("Launcher HTML copies match.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--platform",
        choices=("auto", "mac", "windows"),
        default="auto",
        help="which launcher to build (default: detect the current OS)",
    )
    parser.add_argument(
        "--sync-only",
        action="store_true",
        help="update the embedded and Windows HTML without building an executable",
    )
    args = parser.parse_args()

    target = args.platform
    if target == "auto":
        target = "mac" if sys.platform == "darwin" else "windows" if sys.platform == "win32" else "none"

    try:
        sync_sources()
        if not args.sync_only:
            if target == "mac":
                build_mac()
                verify_copies("macOS")
            elif target == "windows":
                build_windows()
                verify_copies("Windows")
            else:
                raise RuntimeError(
                    "No launcher build is configured for this OS; use --sync-only."
                )
        else:
            verify_copies("sync-only")
        return 0
    except (OSError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"Build failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
