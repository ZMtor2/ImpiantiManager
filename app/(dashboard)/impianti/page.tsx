import Link from "next/link"
import { Plus } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { PlantFilters } from "@/components/impianti/plant-filters"
import { tipoImpiantoLabel, statoImpiantoLabel } from "@/lib/labels"

const statoColor: Record<string, string> = {
  ATTIVO: "bg-green-100 text-green-800",
  INATTIVO: "bg-yellow-100 text-yellow-800",
  DISMESSO: "bg-gray-100 text-gray-600",
}

interface SearchParams {
  q?: string; compagniaId?: string; stato?: string; tipoImpianto?: string; page?: string
}

export default async function ImpiantiPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth()
  const userRole = (session?.user as { ruolo?: string })?.ruolo
  const canWrite = userRole === "ADMIN" || userRole === "TECNICO"

  const params = await searchParams
  const q = params.q ?? ""
  const compagniaIds = params.compagniaId?.split(",").filter(Boolean) ?? []
  const stati = params.stato?.split(",").filter(Boolean) ?? []
  const tipi = params.tipoImpianto?.split(",").filter(Boolean) ?? []
  const page = Math.max(1, parseInt(params.page ?? "1"))
  const perPage = 25

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (q) {
    where.OR = [
      { indirizzo: { contains: q, mode: "insensitive" } },
      { citta: { contains: q, mode: "insensitive" } },
      { alias: { contains: q, mode: "insensitive" } },
      { codice: { contains: q, mode: "insensitive" } },
      { proprietario: { ragioneSociale: { contains: q, mode: "insensitive" } } },
      { gestore: { ragioneSociale: { contains: q, mode: "insensitive" } } },
    ]
  }
  if (compagniaIds.length > 0) where.compagniaId = { in: compagniaIds }
  if (stati.length > 0) where.stato = { in: stati }
  if (tipi.length > 0) where.tipoImpianto = { in: tipi }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let plants: any[] = []
  let total = 0
  let compagnie: Awaited<ReturnType<typeof prisma.compagnia.findMany>> = []

  try {
    ;[plants, total, compagnie] = await Promise.all([
      prisma.plant.findMany({ where, skip: (page - 1) * perPage, take: perPage, orderBy: { updatedAt: "desc" }, include: { compagnia: true } }),
      prisma.plant.count({ where }),
      prisma.compagnia.findMany({ orderBy: { nome: "asc" } }),
    ])
  } catch { /* DB not available */ }

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  const buildPageUrl = (p: number) => {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    if (compagniaIds.length) sp.set("compagniaId", compagniaIds.join(","))
    if (stati.length) sp.set("stato", stati.join(","))
    if (tipi.length) sp.set("tipoImpianto", tipi.join(","))
    sp.set("page", String(p))
    return `/impianti?${sp.toString()}`
  }

  function getInitials(name: string) {
    return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("")
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">Impianti</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} impianti trovati</p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/impianti/nuovo"><Plus className="h-4 w-4 mr-1" />Nuovo impianto</Link>
          </Button>
        )}
      </div>

      <PlantFilters compagnie={compagnie.map(c => ({ id: c.id, nome: c.nome }))} />

      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bandiera</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Indirizzo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Codice</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {plants.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Nessun impianto trovato.</td></tr>
            ) : plants.map((plant) => (
              <tr key={plant.id} className="hover:bg-muted/30 transition-colors cursor-pointer group">
                <td className="px-4 py-3">
                  <Link href={`/impianti/${plant.id}`} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {plant.compagnia ? getInitials(plant.compagnia.nome) : "—"}
                    </div>
                    <span className="font-medium text-sm group-hover:text-[var(--primary)] hidden sm:block">{plant.compagnia?.nome ?? "—"}</span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/impianti/${plant.id}`} className="block">
                    <p className="font-medium group-hover:text-[var(--primary)]">{plant.indirizzo}</p>
                    <p className="text-xs text-muted-foreground">{plant.citta} ({plant.provincia})</p>
                    {plant.alias && <p className="text-xs text-[var(--muted-foreground)]">{plant.alias}</p>}
                  </Link>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell"><Link href={`/impianti/${plant.id}`}><span className="text-xs text-muted-foreground">{tipoImpiantoLabel[plant.tipoImpianto]}</span></Link></td>
                <td className="px-4 py-3 hidden md:table-cell"><Link href={`/impianti/${plant.id}`}><span className="font-mono text-xs">{plant.codice ?? "—"}</span></Link></td>
                <td className="px-4 py-3">
                  <Link href={`/impianti/${plant.id}`}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statoColor[plant.stato]}`}>{statoImpiantoLabel[plant.stato]}</span>
                  </Link>
                </td>
              </tr>
            ))}
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
