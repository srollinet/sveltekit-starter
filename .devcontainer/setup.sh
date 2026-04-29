#!/bin/sh
set -e

log() {
  echo "[setup] $1"
}

if ! docker info > /dev/null 2>&1; then
  # Host kernel uses nftables; switch legacy iptables symlinks to nft variants
  # so Docker daemon can initialize the nat table inside the dev container.
  log "Configuring iptables to use nft backend..."
  sudo update-alternatives --set iptables /usr/sbin/iptables-nft || true
  sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-nft || true
fi

log "Installing dependencies..."
pnpm install --frozen-lockfile 2>/dev/null || true
log "Dependencies installed."

log "Installing Playwright browsers..."
pnpm exec playwright install --with-deps chromium
log "Playwright browsers installed."

log "Adding shell aliases..."

# Disable npm and encourage using pnpm instead
echo 'alias npm="echo \"[error] npm is disabled. Use pnpm instead.\" && false"' >> ~/.bashrc

log "Done."