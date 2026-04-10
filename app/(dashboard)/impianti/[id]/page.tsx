import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { tipoImpiantoLabel, statoImpiantoLabel, tipoApparecchioLabel, tipoCarburanteLabel, modalitaConnessioneLabel, tipoErogatoreLabel, tipoDispositivoLabel } from "@/lib/labels"
import { ArrowLeft, MapPin, Fuel, Users, Network, Camera, Cpu } from "lucide-react"
import { PlantDetailClient } from "@/components/impianti/plant-detail-client"

const statoColor: Record<string, string> = {
  ATTIVO: "bg-green-100 text-green-800",
  INATTIVO: "bg-yellow-100 text-yellow-800",
  DISMESSO: "bg-gray-100 text-gray-600",
}

export default async function PlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userRole = (session?.user as { ruolo?: string })?.ruolo
  const canWrite = userRole === "ADMIN" || userRole === "TECNICO"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let plant: any = null

  try {
    plant = await prisma.plant.findUnique({
      where: { id },
      include: {
        compagnia: true,
        proprietario: { include: { contatti: true } },
        gestore: { include: { contatti: true } },
        apparecchiature: {
          include: {
            pistole: { orderBy: [{ lato: "asc" }, { numeroPistola: "asc" }] },
            terminaleBank: true,
            terminalePetrolio: true,
            schedaMacchina: { include: { rotte: true } },
          },
        },
        networkDevices: { take: 100 },
        documenti: { orderBy: { createdAt: "desc" }, take: 100 },
      },
    })
  } catch {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Errore nel caricamento della scheda impianto.</p>
        <Button variant="outline" asChild className="mt-4"><Link href="/impianti">Torna agli impianti</Link></Button>
      </div>
    )
  }

  if (!plant) notFound()

  const completeness = [
    !!(plant.indirizzo && plant.citta && plant.tipoImpianto && plant.stato),
    !!(plant.compagniaId && plant.codiceImpiantoCompagnia),
    !!(plant.proprietarioId && plant.proprietario?.contatti?.length),
    !!(plant.gestoreId && plant.gestore?.contatti?.length),
    !!(plant.apparecchiature?.length > 0),
    !!(plant.networkDevices?.length > 0),
    !!(plant.documenti?.filter((d: { tipo: string }) => d.tipo === "FOTO").length > 0),
    !!(plant.latitudine && plant.longitudine),
  ]
  const completePct = Math.round((completeness.filter(Boolean).length / completeness.length) * 100)

  const plantTitle = plant.compagnia
    ? `${plant.compagnia.nome} — ${plant.alias ? `${plant.alias} · ` : ""}${plant.indirizzo}, ${plant.citta}`
    : `${plant.indirizzo}, ${plant.citta}`

  const erogatori = plant.apparecchiature?.filter((a: { tipo: string }) => a.tipo === "EROGATORE") ?? []
  const serbatoi = plant.apparecchiature?.filter((a: { tipo: string }) => a.tipo === "SERBATOIO") ?? []
  const colonnine = plant.apparecchiature?.filter((a: { tipo: string }) => a.tipo === "COLONNINA_PAGAMENTO") ?? []
  const gestionali = plant.apparecchiature?.filter((a: { tipo: string }) => a.tipo === "GESTIONALE") ?? []
  const centraline = plant.apparecchiature?.filter((a: { tipo: string }) => a.tipo === "CENTRALINA_LIVELLO") ?? []
  const altri = plant.apparecchiature?.filter((a: { tipo: string }) => !["EROGATORE","SERBATOIO","COLONNINA_PAGAMENTO","GESTIONALE","CENTRALINA_LIVELLO"].includes(a.tipo)) ?? []

  return (
    <div className="space-y-6 pb-10">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/impianti"><ArrowLeft className="h-4 w-4 mr-1" />Impianti</Link>
      </Button>

      <div className="bg-white border border-border rounded-lg p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm shrink-0">
                {plant.compagnia?.nome.slice(0,2).toUpperCase() ?? "—"}
              </div>
              <h1 className="text-xl font-bold text-[var(--primary)]">{plantTitle}</h1>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statoColor[plant.stato]}`}>{statoImpiantoLabel[plant.stato]}</span>
              <span className="text-muted-foreground">{tipoImpiantoLabel[plant.tipoImpianto]}</span>
              {plant.codice && <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{plant.codice}</span>}
            </div>
          </div>
          <PlantDetailClient plantId={plant.id} canWrite={canWrite} />
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Completezza scheda:</span>
            <div className="flex-1 bg-muted rounded-full h-2 max-w-xs">
              <div className="bg-[var(--primary)] h-2 rounded-full transition-all" style={{ width: `${completePct}%` }} />
            </div>
            <span className="text-xs font-semibold">{completePct}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-[var(--primary)]" />Dati generali</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground text-xs">Indirizzo</span><p className="font-medium">{plant.indirizzo}</p></div>
              <div><span className="text-muted-foreground text-xs">Città</span><p className="font-medium">{plant.citta} ({plant.provincia}){plant.cap ? ` ${plant.cap}` : ""}</p></div>
              <div><span className="text-muted-foreground text-xs">Tipo</span><p>{tipoImpiantoLabel[plant.tipoImpianto]}</p></div>
              <div><span className="text-muted-foreground text-xs">Stato</span><p>{statoImpiantoLabel[plant.stato]}</p></div>
              {plant.alias && <div><span className="text-muted-foreground text-xs">Alias</span><p>{plant.alias}</p></div>}
              {plant.numeroAutorizzazione && <div><span className="text-muted-foreground text-xs">N° autorizzazione</span><p>{plant.numeroAutorizzazione}</p></div>}
              {plant.noteGenerali && <div className="col-span-2"><span className="text-muted-foreground text-xs">Note</span><p>{plant.noteGenerali}</p></div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Fuel className="h-4 w-4 text-[var(--primary)]" />Bandiera</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground text-xs">Compagnia</span><p className="font-medium">{plant.compagnia?.nome ?? "—"}</p></div>
              {plant.codiceImpiantoCompagnia && <div><span className="text-muted-foreground text-xs">Codice compagnia</span><p>{plant.codiceImpiantoCompagnia}</p></div>}
              {plant.ispettoreZona && <div><span className="text-muted-foreground text-xs">Ispettore di zona</span><p>{plant.ispettoreZona}</p></div>}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-[var(--primary)]" />Proprietario
                  {plant.clienteManutenzione === "PROPRIETARIO" && <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">Referente</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {plant.proprietario ? (
                  <div className="space-y-1">
                    <p className="font-medium">{plant.proprietario.ragioneSociale}</p>
                    {plant.proprietario.contatti?.map((c: { id: string; nome: string; ruolo: string | null; telefono: string | null }) => (
                      <p key={c.id} className="text-xs text-muted-foreground">{c.nome}{c.ruolo ? ` · ${c.ruolo}` : ""}{c.telefono ? ` · ${c.telefono}` : ""}</p>
                    ))}
                  </div>
                ) : <p className="text-muted-foreground">Non specificato</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-[var(--primary)]" />Gestore
                  {plant.clienteManutenzione === "GESTORE" && <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">Referente</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {plant.gestore ? (
                  <div className="space-y-1">
                    <p className="font-medium">{plant.gestore.ragioneSociale}</p>
                    {plant.gestore.contatti?.map((c: { id: string; nome: string; ruolo: string | null; telefono: string | null }) => (
                      <p key={c.id} className="text-xs text-muted-foreground">{c.nome}{c.ruolo ? ` · ${c.ruolo}` : ""}{c.telefono ? ` · ${c.telefono}` : ""}</p>
                    ))}
                  </div>
                ) : <p className="text-muted-foreground">Non specificato</p>}
              </CardContent>
            </Card>
          </div>

          {plant.apparecchiature?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Cpu className="h-4 w-4 text-[var(--primary)]" />Apparecchiature ({plant.apparecchiature.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {erogatori.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Erogatori</p>
                    {erogatori.map((eq: { id: string; marca: string | null; modello: string | null; tipoErogatore: string | null; matricola: string | null; posizione: string | null; pistole: { id: string; lato: string; numeroPistola: number; tipoCarburante: string }[] }) => (
                      <div key={eq.id} className="border border-border rounded-md p-3 mb-2">
                        <p className="font-medium text-sm">{eq.marca} {eq.modello}{eq.tipoErogatore ? ` · ${tipoErogatoreLabel[eq.tipoErogatore]}` : ""}</p>
                        <p className="text-xs text-muted-foreground">{eq.matricola ?? "—"}{eq.posizione ? ` · ${eq.posizione}` : ""}</p>
                        {eq.pistole.length > 0 && (
                          <div className="mt-2 text-xs space-y-1">
                            {Array.from(new Set(eq.pistole.map((p: { lato: string }) => p.lato))).sort().map(lato => (
                              <div key={String(lato)} className="flex gap-2">
                                <span className="font-medium w-12">Lato {lato}:</span>
                                {eq.pistole.filter((p: { lato: string }) => p.lato === lato).sort((a: { numeroPistola: number }, b: { numeroPistola: number }) => a.numeroPistola - b.numeroPistola).map((p: { id: string; numeroPistola: number; tipoCarburante: string }) => (
                                  <span key={p.id} className="bg-muted px-1.5 py-0.5 rounded">{p.numeroPistola}: {tipoCarburanteLabel[p.tipoCarburante]}</span>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {serbatoi.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Serbatoi</p>
                    {serbatoi.map((eq: { id: string; marca: string | null; modello: string | null; tipoCarburante: string | null; capacitaLitri: number | null; posizione: string | null }) => (
                      <div key={eq.id} className="border border-border rounded-md p-3 mb-2 text-sm">
                        <p className="font-medium">{eq.marca} {eq.modello}</p>
                        <p className="text-xs text-muted-foreground">{eq.tipoCarburante ? tipoCarburanteLabel[eq.tipoCarburante] : "—"}{eq.capacitaLitri ? ` · ${eq.capacitaLitri.toLocaleString("it")} L` : ""}{eq.posizione ? ` · ${eq.posizione}` : ""}</p>
                      </div>
                    ))}
                  </div>
                )}
                {colonnine.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Colonnine</p>
                    {colonnine.map((eq: { id: string; marca: string | null; modello: string | null; matricola: string | null; terminaleBank: { codiceTerminale: string | null; bancaCircuito: string | null; indirizzoIp: string | null; porta: number | null } | null; terminalePetrolio: { codiceTerminale: string | null; protocolloComunicazione: string | null; indirizzoIp: string | null; porta: number | null } | null }) => (
                      <div key={eq.id} className="border border-border rounded-md p-3 mb-2 text-sm space-y-2">
                        <p className="font-medium">{eq.marca} {eq.modello}{eq.matricola ? ` · ${eq.matricola}` : ""}</p>
                        {eq.terminaleBank && <div className="text-xs text-muted-foreground"><p className="font-medium text-foreground">Terminale Bancario</p><p>Codice: {eq.terminaleBank.codiceTerminale ?? "—"} · {eq.terminaleBank.bancaCircuito ?? ""}{eq.terminaleBank.indirizzoIp ? ` · IP: ${eq.terminaleBank.indirizzoIp}` : ""}</p></div>}
                        {eq.terminalePetrolio && <div className="text-xs text-muted-foreground"><p className="font-medium text-foreground">Terminale Petrolifero</p><p>Codice: {eq.terminalePetrolio.codiceTerminale ?? "—"} · {eq.terminalePetrolio.protocolloComunicazione ?? ""}{eq.terminalePetrolio.indirizzoIp ? ` · IP: ${eq.terminalePetrolio.indirizzoIp}` : ""}</p></div>}
                      </div>
                    ))}
                  </div>
                )}
                {gestionali.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Gestionali</p>
                    {gestionali.map((eq: { id: string; marca: string | null; modello: string | null; matricola: string | null; schedaMacchina: { indirizzoIpPc: string | null; tipoAccessoRemoto: string | null; versioneSoftware: string | null } | null }) => (
                      <div key={eq.id} className="border border-border rounded-md p-3 mb-2 text-sm">
                        <p className="font-medium">{eq.marca} {eq.modello}{eq.matricola ? ` · ${eq.matricola}` : ""}</p>
                        {eq.schedaMacchina && <div className="mt-1 text-xs text-muted-foreground flex gap-4">{eq.schedaMacchina.indirizzoIpPc && <span>IP: {eq.schedaMacchina.indirizzoIpPc}</span>}{eq.schedaMacchina.tipoAccessoRemoto && <span>{eq.schedaMacchina.tipoAccessoRemoto}</span>}{eq.schedaMacchina.versioneSoftware && <span>v{eq.schedaMacchina.versioneSoftware}</span>}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {centraline.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Centraline</p>
                    {centraline.map((eq: { id: string; marca: string | null; modello: string | null; modalitaConnessione: string | null; posizione: string | null }) => (
                      <div key={eq.id} className="border border-border rounded-md p-3 mb-2 text-sm">
                        <p className="font-medium">{eq.marca} {eq.modello}</p>
                        <p className="text-xs text-muted-foreground">{eq.modalitaConnessione ? modalitaConnessioneLabel[eq.modalitaConnessione] : "—"}{eq.posizione ? ` · ${eq.posizione}` : ""}</p>
                      </div>
                    ))}
                  </div>
                )}
                {altri.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Altro</p>
                    {altri.map((eq: { id: string; tipo: string; marca: string | null; modello: string | null; posizione: string | null }) => (
                      <div key={eq.id} className="border border-border rounded-md p-3 mb-2 text-sm">
                        <p className="font-medium">{tipoApparecchioLabel[eq.tipo]}: {eq.marca} {eq.modello}</p>
                        {eq.posizione && <p className="text-xs text-muted-foreground">{eq.posizione}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {plant.networkDevices?.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Network className="h-4 w-4 text-[var(--primary)]" />Registro di rete ({plant.networkDevices.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border"><th className="text-left py-2 pr-4 text-muted-foreground">Etichetta</th><th className="text-left py-2 pr-4 text-muted-foreground">Tipo</th><th className="text-left py-2 pr-4 text-muted-foreground">IP</th><th className="text-left py-2 pr-4 text-muted-foreground hidden sm:table-cell">MAC</th></tr></thead>
                    <tbody className="divide-y divide-border">
                      {plant.networkDevices.map((d: { id: string; etichetta: string; tipoDispositivo: string; indirizzoIp: string; macAddress: string | null }) => (
                        <tr key={d.id}><td className="py-2 pr-4 font-medium">{d.etichetta}</td><td className="py-2 pr-4 text-muted-foreground">{tipoDispositivoLabel[d.tipoDispositivo]}</td><td className="py-2 pr-4 font-mono">{d.indirizzoIp}</td><td className="py-2 pr-4 font-mono text-muted-foreground hidden sm:table-cell">{d.macAddress ?? "—"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-3 text-sm">
              <div><span className="text-xs text-muted-foreground">Creato il</span><p>{new Date(plant.createdAt).toLocaleDateString("it-IT")}</p></div>
              <div><span className="text-xs text-muted-foreground">Ultima modifica</span><p>{new Date(plant.updatedAt).toLocaleDateString("it-IT")}</p></div>
              {plant.latitudine && plant.longitudine && <div><span className="text-xs text-muted-foreground">Coordinate</span><p className="font-mono text-xs">{plant.latitudine.toFixed(5)}, {plant.longitudine.toFixed(5)}</p></div>}
            </CardContent>
          </Card>
          {plant.documenti?.filter((d: { tipo: string }) => d.tipo === "FOTO").length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Camera className="h-4 w-4 text-[var(--primary)]" />Foto ({plant.documenti.filter((d: { tipo: string }) => d.tipo === "FOTO").length})</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-1">
                  {plant.documenti.filter((d: { tipo: string }) => d.tipo === "FOTO").slice(0, 6).map((doc: { id: string; urlStorage: string; nomeFile: string }) => (
                    <div key={doc.id} className="aspect-square bg-muted rounded-md overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={doc.urlStorage} alt={doc.nomeFile} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
