#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ImpiantiManager — Aggiornamento applicazione
# Uso: bash scripts/update.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${BLUE}[UPDATE]${NC} $*"; }
ok()   { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail() { echo -e "${RED}[ERRORE]${NC} $*"; exit 1; }

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ── 1. Git pull ───────────────────────────────────────────────────────────────
log "Scarico aggiornamenti dal repository..."
BRANCH=$(git rev-parse --abbrev-ref HEAD)
BEFORE=$(git rev-parse --short HEAD)

git fetch origin "$BRANCH"
AFTER=$(git rev-parse --short "origin/$BRANCH")

if [[ "$BEFORE" == "$AFTER" ]]; then
  warn "Nessun aggiornamento disponibile (già all'ultima versione: $BEFORE)."
  echo ""
  read -rp "Vuoi forzare rebuild e restart comunque? [s/N] " FORCE
  [[ "${FORCE,,}" != "s" ]] && { echo "Operazione annullata."; exit 0; }
fi

git pull origin "$BRANCH"
ok "Aggiornato: $BEFORE → $(git rev-parse --short HEAD)"

# Mostra il changelog
echo ""
git log --oneline "${BEFORE}..HEAD" | head -20
echo ""

# ── 2. Verifica se ci sono nuove migration Prisma ────────────────────────────
HAS_NEW_MIGRATIONS=false
if git diff --name-only "${BEFORE}..HEAD" | grep -q "prisma/migrations/"; then
  HAS_NEW_MIGRATIONS=true
  warn "Rilevate nuove migration del database!"
fi

SCHEMA_CHANGED=false
if git diff --name-only "${BEFORE}..HEAD" | grep -q "prisma/schema.prisma"; then
  SCHEMA_CHANGED=true
  warn "Schema Prisma modificato."
fi

# ── 3. Backup DB (se ci sono cambiamenti al DB) ───────────────────────────────
if [[ "$HAS_NEW_MIGRATIONS" == "true" ]] || [[ "$SCHEMA_CHANGED" == "true" ]]; then
  log "Backup automatico database prima della migrazione..."
  mkdir -p backups

  # Leggi le credenziali dal docker-compose.yml o .env
  DB_USER=$(grep POSTGRES_USER docker-compose.yml | head -1 | awk -F': ' '{print $2}' | tr -d ' "')
  DB_NAME=$(grep POSTGRES_DB docker-compose.yml | head -1 | awk -F': ' '{print $2}' | tr -d ' "')
  DB_USER=${DB_USER:-impianti}
  DB_NAME=${DB_NAME:-impianti_manager}

  BACKUP_FILE="backups/db_backup_${TIMESTAMP}.sql"
  docker compose exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"
  ok "Backup salvato in: $BACKUP_FILE"
fi

# ── 4. Dipendenze npm ────────────────────────────────────────────────────────
PACKAGE_CHANGED=false
if git diff --name-only "${BEFORE}..HEAD" | grep -q "package.json\|package-lock.json"; then
  PACKAGE_CHANGED=true
fi

if [[ "$PACKAGE_CHANGED" == "true" ]]; then
  log "package.json modificato, aggiorno dipendenze..."
  npm install
  ok "Dipendenze aggiornate."
else
  ok "Nessuna nuova dipendenza."
fi

# ── 5. Migrazione DB ─────────────────────────────────────────────────────────
MIGRATIONS_DIR="prisma/migrations"
HAS_MIGRATION_FILES=false
ls "${MIGRATIONS_DIR}"/*/migration.sql &>/dev/null && HAS_MIGRATION_FILES=true

if [[ "$HAS_NEW_MIGRATIONS" == "true" ]] && [[ "$HAS_MIGRATION_FILES" == "true" ]]; then
  log "Applico migration database..."
  npx prisma migrate deploy
  ok "Migration applicate."
elif [[ "$SCHEMA_CHANGED" == "true" ]] || [[ "$HAS_NEW_MIGRATIONS" == "true" ]]; then
  log "Schema aggiornato, applico db push..."
  npx prisma db push
  ok "Schema applicato con db push."
fi

# Rigenera sempre il Prisma client
if [[ "$SCHEMA_CHANGED" == "true" ]] || [[ "$PACKAGE_CHANGED" == "true" ]]; then
  log "Rigenerazione Prisma client..."
  npx prisma generate
  ok "Prisma client rigenerato."
fi

# ── 6. Build ─────────────────────────────────────────────────────────────────
log "Build produzione..."
npm run build
ok "Build completata."

# ── 7. Restart applicazione ──────────────────────────────────────────────────
log "Restart applicazione..."
if command -v pm2 &>/dev/null; then
  if pm2 list | grep -q "impianti"; then
    pm2 restart impianti
    ok "PM2: impianti riavviato."
  else
    pm2 start npm --name "impianti" -- start
    pm2 save
    ok "PM2: impianti avviato."
  fi
else
  warn "PM2 non trovato. Avvia manualmente con: pm2 start npm --name impianti -- start"
fi

# ── Riepilogo ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Aggiornamento completato!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Versione:    ${BLUE}$(git rev-parse --short HEAD)${NC}"
echo -e "  Branch:      $BRANCH"
[[ -f "$BACKUP_FILE" ]] && echo -e "  Backup DB:   $BACKUP_FILE"
echo -e "  Logs:        pm2 logs impianti"
echo ""
