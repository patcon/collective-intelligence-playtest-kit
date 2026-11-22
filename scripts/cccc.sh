#!/usr/bin/env bash
# Runs cccc (https://github.com/moznion/cccc), downloading a pinned release
# into .tools/ on first use. cccc is not published to npm.
set -euo pipefail

VERSION="v1.10.0"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$ROOT/.tools/cccc-$VERSION"
BIN="$BIN_DIR/cccc"

if [[ ! -x "$BIN" ]]; then
  case "$(uname -s)-$(uname -m)" in
    Darwin-arm64) TARGET=aarch64-apple-darwin SHA=3437ca355624ddd4b8b45fba3a8bf46465ab1c30a9d68c85af7a026ba254fbc6 ;;
    Darwin-x86_64) TARGET=x86_64-apple-darwin SHA=a1a74a5b635bae620ed47732005f622faebb731842449c19e17e512ed16be97f ;;
    Linux-aarch64 | Linux-arm64) TARGET=aarch64-unknown-linux-musl SHA=557813fe1a982993e91fe3e561f0174d76ef60d6965d5a44d2607ece1ec9db69 ;;
    Linux-x86_64) TARGET=x86_64-unknown-linux-musl SHA=a11f0fbd560de11078283a2d54aee0d29cf0061585f45ab45cdb810d95db2a84 ;;
    *) echo "cccc.sh: unsupported platform $(uname -s)-$(uname -m)" >&2; exit 1 ;;
  esac
  ARCHIVE="cccc-$VERSION-$TARGET.tar.gz"
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  echo "cccc.sh: downloading $ARCHIVE" >&2
  curl -fsSL -o "$TMP/$ARCHIVE" "https://github.com/moznion/cccc/releases/download/$VERSION/$ARCHIVE"
  echo "$SHA  $TMP/$ARCHIVE" | shasum -a 256 -c - >/dev/null
  tar xzf "$TMP/$ARCHIVE" -C "$TMP"
  mkdir -p "$BIN_DIR"
  mv "$TMP/cccc" "$BIN"
  chmod +x "$BIN"
fi

exec "$BIN" "$@"
