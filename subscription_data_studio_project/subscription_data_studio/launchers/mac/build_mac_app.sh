#!/bin/sh
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GENERATOR_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
APP_DIR="$SCRIPT_DIR/subscription_data_studio.app"
CONTENTS="$APP_DIR/Contents"
MACOS="$CONTENTS/MacOS"
RESOURCES="$CONTENTS/Resources"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
MAC_ARCH="$(uname -m)"

mkdir -p "$MACOS" "$RESOURCES"
cp "$SCRIPT_DIR/Info.plist" "$CONTENTS/Info.plist"
rm -f "$RESOURCES/synthetic_data_generator.html" "$RESOURCES/subscription_billing_logic.md"
sed 's#src="./data_dictionary_definitions.js"#src="../../../data_dictionary_definitions.js"#' "$GENERATOR_DIR/subscription_data_studio.html" > "$RESOURCES/subscription_data_studio.html"
cp "$GENERATOR_DIR/subscription_data_studio_logic.md" "$RESOURCES/subscription_data_studio_logic.md"
cp "$GENERATOR_DIR/EXAMPLE_PROJECT.md" "$RESOURCES/EXAMPLE_PROJECT.md"

case "$MAC_ARCH" in
  arm64|x86_64) ;;
  *) echo "Unsupported Mac architecture: $MAC_ARCH" >&2; exit 1 ;;
esac
swiftc -O -parse-as-library -module-cache-path "$TMP_DIR/module-cache" -target "$MAC_ARCH-apple-macosx12.0" -framework AppKit "$SCRIPT_DIR/main.swift" -o "$MACOS/SyntheticSubscriptionGenerator"
chmod 755 "$MACOS/SyntheticSubscriptionGenerator"
codesign --force --deep --sign - "$APP_DIR"
printf 'Built for %s: %s\n' "$MAC_ARCH" "$APP_DIR"
