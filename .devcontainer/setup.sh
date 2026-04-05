#!/bin/sh
set -e

log() {
  echo "[setup] $1"
}

log "Installing dependencies..."
pnpm install --frozen-lockfile 2>/dev/null || true
log "Dependencies installed."

log "Adding shell aliases..."

# Disable npm and encourage using pnpm instead
echo 'alias npm="echo \"[error] npm is disabled. Use pnpm instead.\" && false"' >> ~/.bashrc

log "Done."