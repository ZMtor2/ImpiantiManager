import Link from "next/link"
import { Plus } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"

export default async function ClientiPage() {
  const session = await auth()
  const userRole = (session?.user as { ruolo?: string })?.ruolo
  const canWrite = userRole === "ADMIN" || userRole === "TECNICO"

  let clienti: Array<{
    id: string; ragioneSociale: string; partitaIva: string | null
    _count: { impiantiProprietario: number; impiantiGestore: number }
    contatti: Array<{ id: string; nome: string; telefono: string | null }>
  }> = []

  try {
    clienti = await prisma.anagrafica.findMany({
      orderBy: { ragioneSociale: "asc" },
      include: {
        _count: { select: { impiantiProprietario: true, impiantiGestore: true } },
        contatti: { take: 1 },
      },
    })
  } catch { /* DB not ready */ }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f4c75]">Clienti</h1>
          <p className="text-sm text-muted-foreground mt-1">{clienti.length} clienti registrati</p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/clienti/nuovo"><Plus className="h-4 w-4 mr-1" />Nuovo cliente</Link>
          </Button>
        )}
      </div>

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
              const totalImpianti = new Set([
                ...Array(c._count.impiantiProprietario).fill("p"),
                ...Array(c._count.impiantiGestore).fill("g"),
              ]).size
              const ruoloBadge = isProprietario && isGestore
                ? "Prop. e Gestore"
                : isProprietario ? "Proprietario"
                : isGestore ? "Gestore" : "—"
              return (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors group cursor-pointer">
                  <td className="px-4 py-3">
                    <Link href={`/clienti/${c.id}`} className="block">
                      <p className="font-medium group-hover:text-[#0f4c75]">{c.ragioneSociale}</p>
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
      </div>
    </div>
  )
}
