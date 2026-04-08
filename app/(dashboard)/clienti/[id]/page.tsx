import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Edit, Phone, Mail } from "lucide-react"
import { statoImpiantoLabel } from "@/lib/labels"

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userRole = (session?.user as { ruolo?: string })?.ruolo
  const canWrite = userRole === "ADMIN" || userRole === "TECNICO"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cliente: any = null

  try {
    cliente = await prisma.anagrafica.findUnique({
      where: { id },
      include: {
        contatti: true,
        impiantiProprietario: { include: { compagnia: true } },
        impiantiGestore: { include: { compagnia: true } },
      },
    })
  } catch { return <div className="text-center py-20 text-muted-foreground">Errore nel caricamento.</div> }

  if (!cliente) notFound()

  const statoColor: Record<string, string> = {
    ATTIVO: "bg-green-100 text-green-800", INATTIVO: "bg-yellow-100 text-yellow-800", DISMESSO: "bg-gray-100 text-gray-600",
  }

  return (
    <div className="space-y-6 pb-10">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/clienti"><ArrowLeft className="h-4 w-4 mr-1" />Clienti</Link>
      </Button>
      <div className="bg-white border border-border rounded-lg p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0f4c75]">{cliente.ragioneSociale}</h1>
            {cliente.partitaIva && <p className="text-sm text-muted-foreground mt-1">P.IVA: {cliente.partitaIva}</p>}
          </div>
          {canWrite && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/clienti/${id}/modifica`}><Edit className="h-4 w-4 mr-1" />Modifica</Link>
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Dati anagrafici</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              {cliente.indirizzo && <div><span className="text-xs text-muted-foreground">Indirizzo</span><p>{cliente.indirizzo}</p></div>}
              {cliente.citta && <div><span className="text-xs text-muted-foreground">Città</span><p>{cliente.citta}{cliente.provincia ? ` (${cliente.provincia})` : ""}</p></div>}
              {cliente.codiceFiscale && <div><span className="text-xs text-muted-foreground">Codice fiscale</span><p>{cliente.codiceFiscale}</p></div>}
              {cliente.note && <div className="col-span-2"><span className="text-xs text-muted-foreground">Note</span><p>{cliente.note}</p></div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Contatti ({cliente.contatti?.length ?? 0})</CardTitle></CardHeader>
            <CardContent>
              {!cliente.contatti?.length
                ? <p className="text-sm text-muted-foreground">Nessun contatto registrato.</p>
                : <div className="space-y-3">
                    {cliente.contatti.map((c: { id: string; nome: string; ruolo: string | null; telefono: string | null; email: string | null }) => (
                      <div key={c.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold shrink-0">{c.nome.slice(0,1).toUpperCase()}</div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{c.nome}</p>
                          {c.ruolo && <p className="text-xs text-muted-foreground">{c.ruolo}</p>}
                          <div className="flex flex-wrap gap-3 mt-1">
                            {c.telefono && <a href={`tel:${c.telefono}`} className="flex items-center gap-1 text-xs text-[#0f4c75] hover:underline"><Phone className="h-3 w-3" />{c.telefono}</a>}
                            {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs text-[#0f4c75] hover:underline"><Mail className="h-3 w-3" />{c.email}</a>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>}
            </CardContent>
          </Card>
          {cliente.impiantiProprietario?.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Impianti come Proprietario ({cliente.impiantiProprietario.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {cliente.impiantiProprietario.map((p: { id: string; indirizzo: string; citta: string; stato: string; codice: string | null; compagnia: { nome: string } | null }) => (
                    <Link key={p.id} href={`/impianti/${p.id}`} className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors group">
                      <div><p className="text-sm font-medium group-hover:text-[#0f4c75]">{p.compagnia?.nome ?? "—"} — {p.indirizzo}, {p.citta}</p>{p.codice && <p className="text-xs text-muted-foreground">{p.codice}</p>}</div>
                      <span className={`text-xs px-2 py-0.5 rounded ${statoColor[p.stato]}`}>{statoImpiantoLabel[p.stato]}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {cliente.impiantiGestore?.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Impianti come Gestore ({cliente.impiantiGestore.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {cliente.impiantiGestore.map((p: { id: string; indirizzo: string; citta: string; stato: string; codice: string | null; compagnia: { nome: string } | null }) => (
                    <Link key={p.id} href={`/impianti/${p.id}`} className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors group">
                      <div><p className="text-sm font-medium group-hover:text-[#0f4c75]">{p.compagnia?.nome ?? "—"} — {p.indirizzo}, {p.citta}</p>{p.codice && <p className="text-xs text-muted-foreground">{p.codice}</p>}</div>
                      <span className={`text-xs px-2 py-0.5 rounded ${statoColor[p.stato]}`}>{statoImpiantoLabel[p.stato]}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <div>
          <Card>
            <CardContent className="pt-4 text-sm space-y-3">
              <div><span className="text-xs text-muted-foreground">Registrato il</span><p>{new Date(cliente.createdAt).toLocaleDateString("it-IT")}</p></div>
              <div><span className="text-xs text-muted-foreground">Impianti Proprietario</span><p className="font-medium">{cliente.impiantiProprietario?.length ?? 0}</p></div>
              <div><span className="text-xs text-muted-foreground">Impianti Gestore</span><p className="font-medium">{cliente.impiantiGestore?.length ?? 0}</p></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
