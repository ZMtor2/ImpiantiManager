#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ImpiantiManager — Setup iniziale su Ubuntu Server
# Uso: bash scripts/setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${BLUE}[SETUP]${NC} $*"; }
ok()   { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail() { echo -e "${RED}[ERRORE]${NC} $*"; exit 1; }

# ── 1. Verifica OS ────────────────────────────────────────────────────────────
log "Verifica sistema..."
[[ "$(uname -s)" == "Linux" ]] || fail "Questo script è pensato per Ubuntu/Debian Linux."

# ── 2. Node.js 20+ ───────────────────────────────────────────────────────────
NODE_OK=false
if command -v node &>/dev/null; then
  NODE_VER=$(node -e "console.log(parseInt(process.versions.node))")
  [[ "$NODE_VER" -ge 20 ]] && NODE_OK=true
fi

if [[ "$NODE_OK" == "false" ]]; then
  log "Installazione Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - &>/dev/null
  sudo apt-get install -y nodejs &>/dev/null
  ok "Node.js $(node -v) installato."
else
  ok "Node.js $(node -v) già presente."
fi

# ── 3. Docker ─────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  log "Installazione Docker..."
  sudo apt-get update -q
  sudo apt-get install -y docker.io docker-compose-plugin &>/dev/null
  sudo systemctl enable --now docker
  sudo usermod -aG docker "$USER"
  warn "Aggiunto $USER al gruppo docker. Riavvia la sessione SSH dopo il setup."
  ok "Docker installato."
else
  ok "Docker $(docker --version | awk '{print $3}' | tr -d ',') già presente."
fi

# ── 4. PM2 ───────────────────────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  log "Installazione PM2..."
  sudo npm install -g pm2 &>/dev/null
  ok "PM2 installato."
else
  ok "PM2 già presente."
fi

# ── 5. File .env ─────────────────────────────────────────────────────────────
log "Configurazione variabili d'ambiente..."
if [[ ! -f .env ]]; then
  [[ -f .env.example ]] || fail "File .env.example non trovato. Assicurati di essere nella cartella del progetto."
  cp .env.example .env
  ok ".env creato da .env.example"
fi

# Genera AUTH_SECRET casuale (rimpiazza placeholder o valore debole)
SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
sed -i "s|AUTH_SECRET=.*|AUTH_SECRET=\"${SECRET}\"|" .env
ok "AUTH_SECRET generato automaticamente."

# Chiedi l'indirizzo del server
echo ""
echo -e "  ${YELLOW}Il file .env si trova nella cartella del progetto (file nascosto, inizia con punto).${NC}"
echo -e "  Per vederlo: ${BLUE}ls -la${NC} oppure ${BLUE}nano .env${NC}"
echo ""
read -rp "  Indirizzo pubblico del server (es. 192.168.1.100 o mio.dominio.it) [invio = localhost]: " SERVER_ADDR
SERVER_ADDR="${SERVER_ADDR:-localhost}"
PORT="${PORT:-3000}"

# Aggiungi schema http:// se mancante
if [[ "$SERVER_ADDR" != http* ]]; then
  SERVER_ADDR="http://${SERVER_ADDR}"
fi

sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=\"${SERVER_ADDR}:${PORT}\"|" .env
ok "NEXTAUTH_URL impostato a: ${SERVER_ADDR}:${PORT}"

echo ""
echo -e "  ${YELLOW}Vuoi modificare altri valori nel .env ora? (DATABASE_URL, MinIO, SMTP)${NC}"
read -rp "  Aprire .env con nano? [s/N] " OPEN_ENV
if [[ "${OPEN_ENV,,}" == "s" ]]; then
  nano .env
fi

# ── 6. Docker Compose (DB + MinIO) ───────────────────────────────────────────
log "Avvio PostgreSQL e MinIO..."
docker compose up -d

# Aspetta che PostgreSQL sia pronto
log "Attesa avvio database (max 30s)..."
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U impianti &>/dev/null; then
    ok "Database pronto."
    break
  fi
  [[ $i -eq 30 ]] && fail "Database non risponde dopo 30s. Controlla con: docker compose logs postgres"
  sleep 1
done

# ── 7. Dipendenze npm ────────────────────────────────────────────────────────
log "Installazione dipendenze npm..."
npm install --prefer-offline 2>&1 | tail -3
ok "Dipendenze installate."

# ── 8. Schema DB + seed ──────────────────────────────────────────────────────
log "Migrazione schema database..."
npx prisma migrate deploy 2>/dev/null || {
  warn "Nessuna migration trovata, uso db:push per il primo setup..."
  npm run db:push
}

log "Seed dati iniziali..."
npm run db:seed
ok "Database configurato."

# ── 9. Build ─────────────────────────────────────────────────────────────────
log "Build produzione..."
npm run build
ok "Build completata."

# ── 10. Avvio con PM2 ────────────────────────────────────────────────────────
log "Avvio applicazione con PM2..."
pm2 delete impianti 2>/dev/null || true
pm2 start npm --name "impianti" -- start
pm2 save

# Configura avvio automatico
PM2_STARTUP=$(pm2 startup 2>&1 | grep "sudo" | tail -1)
if [[ -n "$PM2_STARTUP" ]]; then
  eval "$PM2_STARTUP" &>/dev/null && ok "PM2 configurato per avvio automatico." \
    || warn "Esegui manualmente: $PM2_STARTUP"
fi

# ── Riepilogo ─────────────────────────────────────────────────────────────────
FINAL_URL=$(grep "^NEXTAUTH_URL=" .env | cut -d= -f2- | tr -d '"')
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ImpiantiManager avviato con successo!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  URL:         ${BLUE}${FINAL_URL}${NC}"
echo -e "  Admin:       admin@impiantimanager.it / admin123"
echo -e "  Logs:        pm2 logs impianti"
echo -e "  Stato:       pm2 status"
echo -e "  .env:        nano .env  (file nascosto nella cartella progetto)"
echo ""
echo -e "${YELLOW}  Cambia la password admin dopo il primo accesso!${NC}"
echo ""
