# ImpiantiManager

Web application per il censimento e la gestione degli impianti di rifornimento carburanti.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Prisma 7** ORM + PostgreSQL
- **NextAuth.js v5** (JWT sessions)
- **Tailwind CSS v4** + shadcn/ui components
- **Docker Compose** (PostgreSQL + MinIO)

## Setup locale

### 1. Prerequisiti
- Node.js 20+
- Docker + Docker Compose

### 2. Avviare il database

```bash
docker-compose up -d
```

### 3. Configurare le variabili d'ambiente

```bash
cp .env.example .env
# Modifica .env con i valori appropriati
```

### 4. Migrare il database

```bash
npm run db:push    # applica lo schema (sviluppo)
npm run db:seed    # popola con dati iniziali (admin + compagnie demo)
```

### 5. Avviare l'app

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

**Credenziali di default:** `admin@impiantimanager.it` / `admin123`

## Struttura

```
app/
  (auth)/login/         # Pagina login
  (dashboard)/          # Layout con sidebar
    page.tsx            # Dashboard
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
  db.ts                 # Prisma client
  auth.ts               # NextAuth config
  validations/          # Zod schemas
prisma/
  schema.prisma         # Schema del database
```

## Ruoli

| Ruolo   | Permessi                                   |
|---------|--------------------------------------------|
| Admin   | Accesso completo + gestione utenti         |
| Tecnico | Accesso completo (no gestione utenti)      |
| Viewer  | Sola lettura                               |
