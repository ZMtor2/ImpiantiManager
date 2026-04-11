import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { it } from "date-fns/locale"
import {
  Building2,
  CheckCircle2,
  XCircle,
  Archive,
  Clock,
  MapPin,
  User,
  LayoutDashboard,
} from "lucide-react"
import { prisma } from "@/lib/db"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// ─── Tipo label map ────────────────────────────────────────────────────────────
const TIPO_LABELS: Record<string, string> = {
  STRADALE: "Stradale",
  AUTOSTRADALE: "Autostradale",
  PRIVATO: "Privato",
  INDUSTRIALE: "Industriale",
  NAUTICO: "Nautico",
  AEROPORTUALE: "Aeroportuale",
}

const ALL_TIPI = Object.keys(TIPO_LABELS)

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

// ─── Server Component ─────────────────────────────────────────────────────────
export default async function DashboardPage() {
  // ── Fetch all stats directly via Prisma ──────────────────────────────────────
  let compagnieStats: Array<{
    id: string
    nome: string
    logoUrl: string | null
    _count: { impianti: number }
  }> = []

  let attivi = 0
  let inattivi = 0
  let dismessi = 0

  let tipiStats: Array<{ tipoImpianto: string; _count: number }> = []

  let recenti: Array<{
    id: string
    indirizzo: string
    citta: string
    provincia: string
    updatedAt: Date
    compagnia: { nome: string; logoUrl: string | null } | null
    createdBy: { nome: string; cognome: string }
  }> = []

  let dbError = false

  try {
    ;[compagnieStats, [attivi, inattivi, dismessi], tipiStats, recenti] =
      await Promise.all([
        prisma.compagnia.findMany({
          select: {
            id: true,
            nome: true,
            logoUrl: true,
            _count: { select: { impianti: true } },
          },
          orderBy: { nome: "asc" },
        }),
        Promise.all([
          prisma.plant.count({ where: { stato: "ATTIVO" } }),
          prisma.plant.count({ where: { stato: "INATTIVO" } }),
          prisma.plant.count({ where: { stato: "DISMESSO" } }),
        ]),
        prisma.plant
          .groupBy({ by: ["tipoImpianto"], _count: true })
          .then((rows) =>
            rows.map((r) => ({
              tipoImpianto: r.tipoImpianto as string,
              _count: r._count,
            }))
          ),
        prisma.plant.findMany({
          take: 10,
          orderBy: { updatedAt: "desc" },
          include: {
            compagnia: true,
            createdBy: { select: { nome: true, cognome: true } },
          },
        }),
      ])
  } catch {
    dbError = true
  }

  // Build a count map for tipi, defaulting to 0
  const tipiMap: Record<string, number> = Object.fromEntries(
    ALL_TIPI.map((t) => [t, 0])
  )
  for (const row of tipiStats) {
    tipiMap[row.tipoImpianto] = row._count
  }

  const totalImpianti = attivi + inattivi + dismessi

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (dbError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="rounded-full bg-[var(--muted)] p-4">
          <LayoutDashboard className="h-10 w-10 text-[var(--muted-foreground)]" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--primary)]">
          Impossibile caricare i dati
        </h2>
        <p className="text-sm text-[var(--muted-foreground)] max-w-sm">
          Il database non è raggiungibile in questo momento. Riprova tra poco.
        </p>
      </div>
    )
  }

  // ── Page ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg p-2 bg-[var(--primary)]">
          <LayoutDashboard className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {totalImpianti} impianti totali in gestione
          </p>
        </div>
      </div>

      {/* ── Widget 2 — Stato ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
          Stato impianti
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Attivi */}
          <Link
            href="/impianti?stato=ATTIVO"
            className="group block rounded-xl border-2 border-green-800 bg-green-950/40 p-5 hover:border-green-600 hover:bg-green-950/60 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-green-400 mb-1">
                  Attivi
                </p>
                <p className="text-4xl font-bold text-green-400">{attivi}</p>
              </div>
              <div className="rounded-full bg-green-900/60 p-3 group-hover:bg-green-900 transition-colors">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </Link>

          {/* Inattivi */}
          <Link
            href="/impianti?stato=INATTIVO"
            className="group block rounded-xl border-2 border-yellow-800 bg-yellow-950/40 p-5 hover:border-yellow-600 hover:bg-yellow-950/60 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400 mb-1">
                  Inattivi
                </p>
                <p className="text-4xl font-bold text-yellow-400">{inattivi}</p>
              </div>
              <div className="rounded-full bg-yellow-900/60 p-3 group-hover:bg-yellow-900 transition-colors">
                <XCircle className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </Link>

          {/* Dismessi */}
          <Link
            href="/impianti?stato=DISMESSO"
            className="group block rounded-xl border-2 border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--muted-foreground)] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                  Dismessi
                </p>
                <p className="text-4xl font-bold text-[var(--muted-foreground)]">{dismessi}</p>
              </div>
              <div className="rounded-full bg-[var(--muted)] p-3 transition-colors">
                <Archive className="h-6 w-6 text-[var(--muted-foreground)]" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Widget 1 — Compagnie / Bandiere ──────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
          Impianti per bandiera
        </h2>
        {compagnieStats.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-[var(--muted-foreground)] text-sm">
              Nessuna compagnia registrata.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {compagnieStats.map((c) => (
              <Link
                key={c.id}
                href={`/impianti?compagniaId=${c.id}`}
                className="group block"
              >
                <Card className="h-full hover:border-[var(--primary)] hover:shadow-md transition-all duration-200">
                  <CardContent className="flex items-center gap-4 p-5">
                    {/* Logo or initials avatar */}
                    <div className="shrink-0">
                      {c.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.logoUrl}
                          alt={c.nome}
                          className="h-12 w-12 rounded-full object-contain border border-[var(--border)] bg-[var(--muted)] p-1"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 bg-[var(--primary)]">
                          {getInitials(c.nome)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] truncate transition-colors">
                        {c.nome}
                      </p>
                      <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                        {c._count.impianti}{" "}
                        {c._count.impianti === 1 ? "impianto" : "impianti"}
                      </p>
                    </div>

                    {/* Count badge */}
                    <div className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold bg-[var(--primary)]/10 text-[var(--primary)]">
                      {c._count.impianti}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Row 3: Widget 3 (tipi) + Widget 4 (recenti) ──────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

        {/* ── Widget 3 — Tipi ─────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Impianti per tipo
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-3">
            {ALL_TIPI.map((tipo) => {
              const count = tipiMap[tipo] ?? 0
              const isEmpty = count === 0
              return (
                <Link
                  key={tipo}
                  href={`/impianti?tipoImpianto=${tipo}`}
                  className={`group block rounded-xl border p-4 transition-all duration-200 ${
                    isEmpty
                      ? "border-[var(--border)] bg-[var(--card)] opacity-40 cursor-default pointer-events-none"
                      : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)] hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Building2
                      className={`h-4 w-4 shrink-0 ${
                        isEmpty ? "text-[var(--muted-foreground)]" : "text-[var(--primary)]"
                      }`}
                    />
                    <p
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        isEmpty ? "text-[var(--muted-foreground)]" : "text-[var(--muted-foreground)]"
                      }`}
                    >
                      {TIPO_LABELS[tipo]}
                    </p>
                  </div>
                  <p
                    className={`text-3xl font-bold ${
                      isEmpty ? "text-[var(--muted-foreground)]" : "text-[var(--primary)]"
                    }`}
                  >
                    {count}
                  </p>
                </Link>
              )
            })}
          </div>
        </section>

        {/* ── Widget 4 — Ultimi modificati ────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Ultimi modificati
          </h2>
          <Card>
            {recenti.length === 0 ? (
              <CardContent className="flex items-center justify-center py-12 text-[var(--muted-foreground)] text-sm">
                Nessun impianto trovato.
              </CardContent>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {recenti.map((plant) => (
                  <Link
                    key={plant.id}
                    href={`/impianti/${plant.id}`}
                    className="group flex items-start gap-3 px-5 py-4 hover:bg-[var(--secondary)] transition-colors"
                  >
                    {/* Company avatar */}
                    <div className="shrink-0 mt-0.5">
                      {plant.compagnia?.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={plant.compagnia.logoUrl}
                          alt={plant.compagnia.nome}
                          className="h-8 w-8 rounded-full object-contain border border-[var(--border)] bg-[var(--muted)] p-0.5"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 bg-[var(--primary)]">
                          {plant.compagnia
                            ? getInitials(plant.compagnia.nome)
                            : "—"}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <MapPin className="h-3 w-3 text-[var(--muted-foreground)] shrink-0" />
                        <p className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] truncate transition-colors">
                          {plant.indirizzo}
                        </p>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] truncate">
                        {plant.citta}{" "}
                        <span className="text-[var(--muted-foreground)]">({plant.provincia})</span>
                        {plant.compagnia && (
                          <span className="ml-1 text-[var(--primary)] font-medium">
                            · {plant.compagnia.nome}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                          <User className="h-3 w-3" />
                          <span>
                            {plant.createdBy.nome} {plant.createdBy.cognome}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(plant.updatedAt), {
                              addSuffix: true,
                              locale: it,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  )
}
