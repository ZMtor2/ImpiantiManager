import Link from "next/link"
import { Plus } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"

interface SearchParams { q?: string; page?: string }

export default async function ClientiPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth()
  const userRole = (session?.user as { ruolo?: string })?.ruolo
  const canWrite = userRole === "ADMIN" || userRole === "TECNICO"

  const params = await searchParams
  const q = params.q ?? ""
  const page = Math.max(1, parseInt(params.page ?? "1"))
  const perPage = 25

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = q
    ? { ragioneSociale: { contains: q, mode: "insensitive" } }
    : {}

  let clienti: Array<{
    id: string; ragioneSociale: string; partitaIva: string | null
    _count: { impiantiProprietario: number; impiantiGestore: number }
    contatti: Array<{ id: string; nome: string; telefono: string | null }>
  }> = []
  let total = 0

  try {
    ;[clienti, total] = await Promise.all([
      prisma.anagrafica.findMany({
        where,
        orderBy: { ragioneSociale: "asc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          _count: { select: { impiantiProprietario: true, impiantiGestore: true } },
          contatti: { take: 1 },
        },
      }),
      prisma.anagrafica.count({ where }),
    ])
  } catch { /* DB not ready */ }

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  const buildPageUrl = (p: number) => {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    sp.set("page", String(p))
    return `/clienti?${sp.toString()}`
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">Clienti</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} clienti registrati</p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/clienti/nuovo"><Plus className="h-4 w-4 mr-1" />Nuovo cliente</Link>
          </Button>
        )}
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Cerca per ragione sociale..."
          className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
        />
        <Button type="submit" variant="outline" size="sm">Cerca</Button>
        {q && <Button type="button" variant="ghost" size="sm" asChild><Link href="/clienti">Annulla</Link></Button>}
      </form>

      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ragione sociale</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">P.IVA</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Impianti</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Referente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clienti.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Nessun cliente trovato.</td></tr>
            ) : clienti.map((c) => {
              const isProprietario = c._count.impiantiProprietario > 0
              const isGestore = c._count.impiantiGestore > 0
              const ruoloBadge = isProprietario && isGestore
                ? "Prop. e Gestore"
                : isProprietario ? "Proprietario"
                : isGestore ? "Gestore" : "—"
              return (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors group cursor-pointer">
                  <td className="px-4 py-3">
                    <Link href={`/clienti/${c.id}`} className="block">
                      <p className="font-medium group-hover:text-[var(--primary)]">{c.ragioneSociale}</p>
                      <p className="text-xs text-muted-foreground">{ruoloBadge}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Link href={`/clienti/${c.id}`}><span className="text-xs">{c.partitaIva ?? "—"}</span></Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/clienti/${c.id}`}>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                        {c._count.impiantiProprietario + c._count.impiantiGestore}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Link href={`/clienti/${c.id}`}>
                      {c.contatti[0] ? (
                        <div>
                          <p className="text-xs font-medium">{c.contatti[0].nome}</p>
                          {c.contatti[0].telefono && <p className="text-xs text-muted-foreground">{c.contatti[0].telefono}</p>}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-sm text-muted-foreground">Pagina {page} di {totalPages} · {total} risultati</p>
            <div className="flex gap-2">
              {page > 1 && <Button variant="outline" size="sm" asChild><Link href={buildPageUrl(page - 1)}>Precedente</Link></Button>}
              {page < totalPages && <Button variant="outline" size="sm" asChild><Link href={buildPageUrl(page + 1)}>Successiva</Link></Button>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
