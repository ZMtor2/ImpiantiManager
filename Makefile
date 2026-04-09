# ImpiantiManager — Comandi rapidi
# Uso: make <comando>

.PHONY: help setup update dev build start stop restart logs status backup db-studio db-reset

help: ## Mostra questo aiuto
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ── Deployment ────────────────────────────────────────────────────────────────
setup: ## Setup iniziale su nuovo server (installa tutto)
	@bash scripts/setup.sh

update: ## Aggiorna l'app (git pull + migration + rebuild + restart)
	@bash scripts/update.sh

# ── Sviluppo locale ───────────────────────────────────────────────────────────
dev: ## Avvia in modalità sviluppo (hot reload)
	@npm run dev

build: ## Build produzione
	@npm run build

# ── Processo (PM2) ───────────────────────────────────────────────────────────
start: ## Avvia con PM2
	@pm2 start npm --name "impianti" -- start

stop: ## Ferma l'app
	@pm2 stop impianti

restart: ## Riavvia l'app
	@pm2 restart impianti

logs: ## Mostra i log in tempo reale
	@pm2 logs impianti --lines 50

status: ## Stato PM2 e Docker
	@echo "\n=== PM2 ==="
	@pm2 status
	@echo "\n=== Docker ==="
	@docker compose ps

# ── Database ──────────────────────────────────────────────────────────────────
db-studio: ## Apri Prisma Studio (interfaccia DB visuale)
	@npm run db:studio

backup: ## Backup manuale del database
	@mkdir -p backups
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
	docker compose exec -T postgres pg_dump -U impianti impianti_manager \
		> "backups/db_backup_$${TIMESTAMP}.sql" && \
	echo "Backup salvato: backups/db_backup_$${TIMESTAMP}.sql"

restore: ## Ripristina un backup (uso: make restore FILE=backups/db_backup_XXX.sql)
	@test -n "$(FILE)" || (echo "Specifica il file: make restore FILE=backups/db_backup_XXX.sql" && exit 1)
	@echo "Ripristino $(FILE)..."
	@docker compose exec -T postgres psql -U impianti -d impianti_manager < $(FILE)
	@echo "Ripristino completato."

db-reset: ## ATTENZIONE: cancella e ricrea tutto il database
	@echo "⚠️  Questa operazione CANCELLA tutti i dati. Sei sicuro?"
	@read -p "Digita 'RESET' per confermare: " confirm; \
	[ "$$confirm" = "RESET" ] || (echo "Annullato." && exit 1)
	@npm run db:push -- --force-reset
	@npm run db:seed
	@echo "Database resettato con dati di default."
