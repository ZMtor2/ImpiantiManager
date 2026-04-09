# ImpiantiManager

Web application per il censimento e la gestione degli impianti di rifornimento carburanti.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Prisma 7** ORM + PostgreSQL
- **NextAuth.js v5** (JWT sessions)
- **Tailwind CSS v4** + shadcn/ui components
- **Docker Compose** (PostgreSQL + MinIO)

---

## Sviluppo locale

### Prerequisiti
- Node.js 20+
- Docker + Docker Compose

### Avvio rapido

```bash
# 1. Avvia database e MinIO
docker compose up -d

# 2. Configura le variabili d'ambiente
cp .env.example .env
# Modifica .env con i valori appropriati

# 3. Schema DB e dati iniziali
npm run db:push
npm run db:seed

# 4. Avvia in modalità sviluppo
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

**Credenziali di default:** `admin@impiantimanager.it` / `admin123`

> Cambia la password admin dopo il primo accesso.

---

## Deploy su Ubuntu Server

### Setup iniziale (una volta sola)

```bash
git clone <url-repo>
cd ImpiantiManager
bash scripts/setup.sh
```

Lo script installa automaticamente Node.js 20, Docker, PM2, configura `.env`
(chiedendo l'IP/dominio del server e generando `NEXTAUTH_SECRET`), avvia i
container, migra il database e lancia l'app in produzione con PM2.

### Aggiornamenti

```bash
bash scripts/update.sh
# oppure
make update
```

Lo script:
1. Esegue `git pull` e mostra il changelog
2. Rileva automaticamente nuove migration Prisma
3. **Fa un backup automatico del DB** prima di applicare modifiche allo schema
4. Aggiorna le dipendenze npm (solo se `package.json` è cambiato)
5. Applica le migration con `prisma migrate deploy` (sicuro in produzione)
6. Rebuilda e riavvia l'app con PM2

### Comandi Makefile

```bash
make help       # lista tutti i comandi disponibili

# Processo
make start      # avvia con PM2
make stop       # ferma l'app
make restart    # riavvia l'app
make logs       # log in tempo reale
make status     # stato PM2 + Docker

# Database
make backup                              # backup manuale
make restore FILE=backups/db_backup.sql  # ripristino da backup
make db-studio                           # apri Prisma Studio
make db-reset                            # RESET COMPLETO (chiede conferma)
```

### Gestione aggiornamenti del database

Per modificare lo schema in modo sicuro:

```bash
# 1. In sviluppo: crea il file di migration
npx prisma migrate dev --name aggiungi-campo-xyz

# 2. Commit e push della migration + codice

# 3. Sul server: make update applica la migration automaticamente
make update
```

| Comando | Quando usarlo |
|---------|--------------|
| `npm run db:push` | Sviluppo locale (rapido, non crea file migration) |
| `npm run db:migrate:prod` | Produzione (applica migration esistenti senza perdita dati) |
| `make backup` | Prima di qualsiasi operazione rischiosa |

---

## Struttura del progetto

```
app/
  (auth)/login/         # Pagina login
  (dashboard)/          # Layout con sidebar
    page.tsx            # Dashboard (4 widget: stato, bandiere, tipi, recenti)
    impianti/           # Lista, wizard creazione, scheda dettaglio
    clienti/            # Lista e scheda clienti
    impostazioni/       # Compagnie petrolifere, utenti
  api/                  # Route handlers REST
components/
  ui/                   # Componenti base (shadcn-style)
  impianti/             # Wizard, tabella, filtri, dettaglio
  clienti/              # Form e scheda cliente
  compagnie/            # Gestione compagnie
  utenti/               # Gestione utenti
lib/
  db.ts                 # Prisma client (adapter pg)
  auth.ts               # NextAuth v5 config
  labels.ts             # Label italiane per tutti gli enum
prisma/
  schema.prisma         # Schema del database
  seed.ts               # Dati iniziali (admin + compagnie demo)
scripts/
  setup.sh              # Setup completo su nuovo server Ubuntu
  update.sh             # Aggiornamento sicuro con backup automatico
Makefile                # Comandi operativi rapidi
```

## Ruoli

| Ruolo   | Permessi                                   |
|---------|--------------------------------------------|
| Admin   | Accesso completo + gestione utenti         |
| Tecnico | Accesso completo (no gestione utenti)      |
| Viewer  | Sola lettura                               |
