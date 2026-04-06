#!/bin/bash
# ColdReach — Oracle Cloud Deployment Script
# Run this on your Oracle Cloud ARM VM (Ubuntu)

set -e

echo "╔══════════════════════════════════════════╗"
echo "║  ColdReach — Oracle Cloud Setup          ║"
echo "╚══════════════════════════════════════════╝"

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "[+] Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "Docker installed. Log out and back in, then re-run this script."
    exit 0
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "[+] Installing Docker Compose..."
    sudo apt install -y docker-compose-plugin
fi

# Clone repo (or pull latest)
if [ ! -d "/opt/coldreach" ]; then
    echo "[+] Cloning repo..."
    sudo mkdir -p /opt/coldreach
    sudo chown $USER:$USER /opt/coldreach
    # TODO: replace with your actual repo URL
    # git clone https://github.com/pushks18/coldreach.git /opt/coldreach
    echo "Place your coldreach code at /opt/coldreach"
fi

cd /opt/coldreach/docker

# Build and start
echo "[+] Building containers..."
docker compose build

echo "[+] Starting services..."
docker compose up -d

# Pull Ollama model
echo "[+] Pulling llama3.2:3b model (this takes a few minutes)..."
sleep 10  # wait for ollama container to start
docker exec coldreach-ollama-1 ollama pull llama3.2:3b || true

# Open firewall
echo "[+] Opening port 80..."
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ColdReach is running!                   ║"
echo "║  Dashboard: http://$(curl -s ifconfig.me)         ║"
echo "║  API:       http://$(curl -s ifconfig.me):3333    ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Open the dashboard in your browser"
echo "  2. Go to Settings → enter your Supabase URL and Key"
echo "  3. The pipeline runs automatically at 8am & 9pm daily"
echo "  4. To login to LinkedIn in the container:"
echo "     docker exec -it coldreach-companion-1 bash"
echo "     # Then manually navigate Playwright to linkedin.com"
