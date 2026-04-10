#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ImpiantiManager — Setup iniziale su Ubuntu Server
# Uso: bash scripts/setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "\n${BLUE}[SETUP]${NC} $*"; }
ok()   { echo -e "${GREEN}  ✓${NC} $*"; }
warn() { echo -e "${YELLOW}  ⚠${NC} $*"; }
fail() { echo -e "\n${RED}[ERRORE]${NC} $*\n"; exit 1; }

# ── 1. Verifica OS ────────────────────────────────────────────────────────────
log "Verifica sistema..."
[[ "$(uname -s)" == "Linux" ]] || fail "Questo script richiede Ubuntu/Debian Linux."
ok "Sistema Linux rilevato."

# ── 2. Node.js 20+ ───────────────────────────────────────────────────────────
log "Verifica Node.js..."
NODE_OK=false
if command -v node &>/dev/null; then
  NODE_VER=$(node -e "console.log(parseInt(process.versions.node))")
  [[ "$NODE_VER" -ge 20 ]] && NODE_OK=true
fi

if [[ "$NODE_OK" == "false" ]]; then
  log "Installazione Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ok "Node.js $(node -v) installato."
else
  ok "Node.js $(node -v) già presente."
fi

# ── 3. Docker (repo ufficiale Docker, funziona su Ubuntu 20/22/24) ────────────
log "Verifica Docker..."
if ! command -v docker &>/dev/null; then
  log "Installazione Docker dal repository ufficiale..."
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl gnupg

  # Aggiungi la chiave GPG ufficiale Docker
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc

  # Aggiungi il repository Docker
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu \
$(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin

  sudo systemctl enable --now docker
  sudo usermod -aG docker "$USER"
  warn "Aggiunto $USER al gruppo docker."
  warn "Dopo il setup, esegui: newgrp docker  (oppure riavvia la sessione SSH)"
  ok "Docker $(docker --version | awk '{print $3}' | tr -d ',') installato."
else
  ok "Docker $(docker --version | awk '{print $3}' | tr -d ',') già presente."
fi

# Verifica docker compose plugin
if ! docker compose version &>/dev/null; then
  log "Installazione docker-compose-plugin..."
  sudo apt-get install -y docker-compose-plugin
  ok "docker compose plugin installato."
fi

# ── 4. PM2 ───────────────────────────────────────────────────────────────────
log "Verifica PM2..."
if ! command -v pm2 &>/dev/null; then
  sudo npm install -g pm2
  ok "PM2 installato."
else
  ok "PM2 già presente."
fi

# ── 5. File .env ─────────────────────────────────────────────────────────────
log "Configurazione .env..."
[[ -f .env.example ]] || fail ".env.example non trovato. Sei nella cartella del progetto?\nEsegui: cd /path/ImpiantiManager"

if [[ ! -f .env ]]; then
  cp .env.example .env
  ok ".env creato da .env.example"
fi

# Genera AUTH_SECRET casuale
SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
sed -i "s|AUTH_SECRET=.*|AUTH_SECRET=\"${SECRET}\"|" .env
ok "AUTH_SECRET generato."

# Chiedi indirizzo server
echo ""
read -rp "  Indirizzo del server (IP o dominio, invio = localhost): " SERVER_ADDR
SERVER_ADDR="${SERVER_ADDR:-localhost}"
[[ "$SERVER_ADDR" != http* ]] && SERVER_ADDR="http://${SERVER_ADDR}"
PORT="${PORT:-3000}"
sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=\"${SERVER_ADDR}:${PORT}\"|" .env
ok "NEXTAUTH_URL → ${SERVER_ADDR}:${PORT}"

# Offri di aprire .env
echo ""
echo -e "  ${YELLOW}Vuoi aprire .env per modifiche manuali (es. DATABASE_URL, MinIO)?${NC}"
read -rp "  Apri con nano? [s/N] " OPEN_ENV
[[ "${OPEN_ENV,,}" == "s" ]] && nano .env

# ── 6. Docker Compose (DB + MinIO) ───────────────────────────────────────────
log "Avvio PostgreSQL e MinIO con Docker..."
docker compose up -d
ok "Container avviati."

# Aspetta che PostgreSQL sia pronto
log "Attesa database (max 30s)..."
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U impianti &>/dev/null; then
    ok "Database pronto (${i}s)."
    break
  fi
  [[ $i -eq 30 ]] && fail "Database non risponde dopo 30s.\nControlla: docker compose logs postgres"
  sleep 1
done

# ── 7. Dipendenze npm + Prisma client ───────────────────────────────────────
log "Installazione dipendenze npm..."
npm install
ok "Dipendenze installate."

log "Generazione Prisma client..."
npx prisma generate
ok "Prisma client generato."

# ── 8. Schema DB + seed ──────────────────────────────────────────────────────
log "Migrazione schema database..."
if npx prisma migrate deploy 2>/dev/null; then
  ok "Migration applicate."
else
  warn "Nessuna migration trovata, uso db:push..."
  npm run db:push
  ok "Schema applicato con db:push."
fi

log "Seed dati iniziali..."
npm run db:seed
ok "Dati iniziali inseriti."

# ── 9. Build ─────────────────────────────────────────────────────────────────
log "Build produzione (può richiedere qualche minuto)..."
npm run build
ok "Build completata."

# ── 10. Avvio con PM2 ────────────────────────────────────────────────────────
log "Avvio con PM2..."
pm2 delete impianti 2>/dev/null || true
pm2 start npm --name "impianti" -- start
pm2 save

PM2_STARTUP=$(pm2 startup 2>&1 | grep "sudo" | tail -1)
if [[ -n "$PM2_STARTUP" ]]; then
  eval "$PM2_STARTUP" && ok "PM2 avvio automatico configurato." \
    || warn "Configura manualmente: $PM2_STARTUP"
fi

# Apri porta firewall se ufw è attivo
if command -v ufw &>/dev/null && sudo ufw status | grep -q "active"; then
  sudo ufw allow "${PORT}/tcp" &>/dev/null || true
  ok "Porta ${PORT} aperta nel firewall."
fi

# ── Riepilogo ─────────────────────────────────────────────────────────────────
FINAL_URL=$(grep "^NEXTAUTH_URL=" .env | cut -d= -f2- | tr -d '"')
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ImpiantiManager avviato con successo!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  URL:      ${BLUE}${FINAL_URL}${NC}"
echo -e "  Login:    admin@impiantimanager.it  /  admin123"
echo -e "  Logs:     pm2 logs impianti"
echo -e "  Stato:    pm2 status"
echo -e "  Config:   nano .env"
echo ""
echo -e "${YELLOW}  ⚠  Cambia la password admin dopo il primo accesso!${NC}"
echo ""
