"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Trash2, Plus, Save, Loader2, Search, X, User } from "lucide-react"
import { toast } from "sonner"
import { tipoApparecchioLabel, tipoDispositivoLabel } from "@/lib/labels"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Compagnia { id: string; nome: string }
interface Anagrafica { id: string; ragioneSociale: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface PlantEditClientProps { plant: any; compagnie: Compagnia[] }

// ─── Schemas ──────────────────────────────────────────────────────────────────
const GeneraleSchema = z.object({
  indirizzo: z.string().min(1, "Indirizzo richiesto"),
  citta: z.string().min(1, "Città richiesta"),
  provincia: z.string().length(2, "2 lettere"),
  cap: z.string().optional().nullable(),
  compagniaId: z.string().min(1, "Compagnia richiesta"),
  codiceImpiantoCompagnia: z.string().optional().nullable(),
  ispettoreZona: z.string().optional().nullable(),
  tipoImpianto: z.string().default("STRADALE"),
  stato: z.string().default("ATTIVO"),
  codice: z.string().optional().nullable(),
  alias: z.string().optional().nullable(),
  numeroAutorizzazione: z.string().optional().nullable(),
  dataApertura: z.string().optional().nullable(),
  noteGenerali: z.string().optional().nullable(),
})
type GeneraleData = z.infer<typeof GeneraleSchema>

const portaPreprocess = (v: unknown) =>
  v === "" || v == null ? null : isNaN(Number(v)) ? null : Number(v)
const strOrNull = z.preprocess(v => (v === "" ? null : v), z.string().optional().nullable())

const ApparecchiaturaSchema = z.object({
  tipo: z.string().min(1),
  marca: z.string().optional().nullable(),
  modello: z.string().optional().nullable(),
  matricola: z.string().optional().nullable(),
  posizione: z.string().optional().nullable(),
  stato: z.string().default("FUNZIONANTE"),
  note: z.string().optional().nullable(),
  terminaleBank: z.object({
    codiceTerminale: strOrNull,
    bancaCircuito: strOrNull,
    tipoConnessione: strOrNull,
    framingMessaggi: z.string().optional().nullable(),
    indirizzoIp: strOrNull,
    porta: z.preprocess(portaPreprocess, z.number().int().optional().nullable()),
  }).optional().nullable(),
  terminalePetrolio: z.object({
    codiceTerminale: strOrNull,
    protocolloComunicazione: strOrNull,
    indirizzoIp: strOrNull,
    porta: z.preprocess(portaPreprocess, z.number().int().optional().nullable()),
  }).optional().nullable(),
})
type ApparecchiaturaData = z.infer<typeof ApparecchiaturaSchema>

const ReteSchema = z.object({
  etichetta: z.string().min(1, "Etichetta richiesta"),
  tipoDispositivo: z.string().min(1),
  indirizzoIp: z.string().min(1, "IP richiesto").regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Formato IP non valido"),
  macAddress: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
})
type ReteData = z.infer<typeof ReteSchema>

// ─── Anagrafica Search ─────────────────────────────────────────────────────────
function AnagraficaSearch({
  label, value, onChange,
}: { label: string; value: Anagrafica | null; onChange: (a: Anagrafica | null) => void }) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<Anagrafica[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((query: string) => {
    setQ(query)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/anagrafica/search?q=${encodeURIComponent(query)}`)
        if (res.ok) { setResults(await res.json()); setOpen(true) }
      } finally { setLoading(false) }
    }, 300)
  }, [])

  if (value) {
    return (
      <div className="flex items-center gap-2 p-2.5 border border-[var(--border)] rounded-md bg-[var(--secondary)]">
        <User className="h-4 w-4 text-[var(--primary)] shrink-0" />
        <span className="text-sm font-medium flex-1">{value.ragioneSociale}</span>
        <button type="button" onClick={() => onChange(null)} className="text-[var(--muted-foreground)] hover:text-[var(--destructive)]">
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
        <Input
          placeholder={`Cerca ${label}...`}
          value={q}
          onChange={e => search(e.target.value)}
          className="pl-8"
        />
        {loading && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-[var(--muted-foreground)]" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-md shadow-lg max-h-48 overflow-y-auto">
          {results.map(r => (
            <button
              type="button"
              key={r.id}
              onClick={() => { onChange(r); setQ(""); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--secondary)] transition-colors"
            >
              {r.ragioneSociale}
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && !loading && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-md shadow-lg px-3 py-2 text-sm text-[var(--muted-foreground)]">
          Nessun risultato
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function PlantEditClient({ plant, compagnie }: PlantEditClientProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Proprietario / Gestore state
  const [proprietario, setProprietario] = useState<Anagrafica | null>(
    plant.proprietario ? { id: plant.proprietario.id, ragioneSociale: plant.proprietario.ragioneSociale } : null
  )
  const [gestore, setGestore] = useState<Anagrafica | null>(
    plant.gestore ? { id: plant.gestore.id, ragioneSociale: plant.gestore.ragioneSociale } : null
  )
  const [clienteManutenzione, setClienteManutenzione] = useState<string>(plant.clienteManutenzione ?? "NESSUNO")

  // Apparecchiature state
  const [apparecchiature, setApparecchiature] = useState<{ id: string; tipo: string; marca: string | null; modello: string | null; matricola: string | null; posizione: string | null; stato: string }[]>(plant.apparecchiature ?? [])
  const [addingEq, setAddingEq] = useState(false)
  const [deletingEqId, setDeletingEqId] = useState<string | null>(null)

  // SchedaMacchina state (for GESTIONALE type)
  const emptyScheda = { indirizzoIpPc: "", usernameSistema: "", passwordSistema: "", passwordPumapro: "", passwordAdmin: "", tipoAccessoRemoto: "", portaAccessoRemoto: "", subnetMask: "", gateway: "", dnsPrimario: "", dnsSecondario: "", tipoRete: "", versioneSoftware: "", numeroLicenza: "", scadenzaLicenza: "" }
  const [schedaFields, setSchedaFields] = useState(emptyScheda)
  const [rotte, setRotte] = useState<{ reteDestinazione: string; gateway: string }[]>([])
  const [newRotta, setNewRotta] = useState({ ip: "", subnetMask: "", gateway: "" })
  const addRotta = () => {
    if (!newRotta.ip.trim() || !newRotta.gateway.trim()) return
    const rete = newRotta.subnetMask.trim() ? `${newRotta.ip.trim()} ${newRotta.subnetMask.trim()}` : newRotta.ip.trim()
    setRotte(prev => [...prev, { reteDestinazione: rete, gateway: newRotta.gateway.trim() }])
    setNewRotta({ ip: "", subnetMask: "", gateway: "" })
  }
  const resetSchedaState = () => { setSchedaFields(emptyScheda); setRotte([]); setNewRotta({ ip: "", subnetMask: "", gateway: "" }) }

  // Rete state
  const [devices, setDevices] = useState<{ id: string; etichetta: string; tipoDispositivo: string; indirizzoIp: string; macAddress: string | null }[]>(plant.networkDevices ?? [])
  const [addingDev, setAddingDev] = useState(false)
  const [deletingDevId, setDeletingDevId] = useState<string | null>(null)

  // ── Generale form ────────────────────────────────────────────────────────────
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<GeneraleData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(GeneraleSchema) as any,
    defaultValues: {
      indirizzo: plant.indirizzo ?? "",
      citta: plant.citta ?? "",
      provincia: plant.provincia ?? "",
      cap: plant.cap ?? "",
      compagniaId: plant.compagniaId ?? "",
      codiceImpiantoCompagnia: plant.codiceImpiantoCompagnia ?? "",
      ispettoreZona: plant.ispettoreZona ?? "",
      tipoImpianto: plant.tipoImpianto ?? "STRADALE",
      stato: plant.stato ?? "ATTIVO",
      codice: plant.codice ?? "",
      alias: plant.alias ?? "",
      numeroAutorizzazione: plant.numeroAutorizzazione ?? "",
      dataApertura: plant.dataApertura ? new Date(plant.dataApertura).toISOString().split("T")[0] : "",
      noteGenerali: plant.noteGenerali ?? "",
    },
  })

  const saveGenerale = handleSubmit(async (data: GeneraleData) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/impianti/${plant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          dataApertura: data.dataApertura || null,
          proprietarioId: proprietario?.id ?? null,
          gestoreId: gestore?.id ?? null,
          clienteManutenzione: (clienteManutenzione === "NESSUNO" || !clienteManutenzione) ? null : clienteManutenzione,
        }),
      })
      if (res.ok) {
        toast.success("Dati salvati")
        router.refresh()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? "Errore durante il salvataggio")
      }
    } finally { setSaving(false) }
  })

  // ── Apparecchiatura form ─────────────────────────────────────────────────────
  const eqForm = useForm<ApparecchiaturaData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ApparecchiaturaSchema) as any,
    defaultValues: { tipo: "EROGATORE", stato: "FUNZIONANTE" },
  })
  const eqTipo = eqForm.watch("tipo")

  const addApparecchiatura = eqForm.handleSubmit(async (data: ApparecchiaturaData) => {
    setAddingEq(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bodyData: Record<string, any> = { ...data }
      if (data.tipo === "GESTIONALE") {
        bodyData.schedaMacchina = {
          indirizzoIpPc: schedaFields.indirizzoIpPc || null,
          usernameSistema: schedaFields.usernameSistema || null,
          passwordSistema: schedaFields.passwordSistema || null,
          passwordPumapro: schedaFields.passwordPumapro || null,
          passwordAdmin: schedaFields.passwordAdmin || null,
          tipoAccessoRemoto: schedaFields.tipoAccessoRemoto || null,
          portaAccessoRemoto: schedaFields.portaAccessoRemoto ? parseInt(schedaFields.portaAccessoRemoto, 10) || null : null,
          subnetMask: schedaFields.subnetMask || null,
          gateway: schedaFields.gateway || null,
          dnsPrimario: schedaFields.dnsPrimario || null,
          dnsSecondario: schedaFields.dnsSecondario || null,
          tipoRete: schedaFields.tipoRete || null,
          versioneSoftware: schedaFields.versioneSoftware || null,
          numeroLicenza: schedaFields.numeroLicenza || null,
          scadenzaLicenza: schedaFields.scadenzaLicenza || null,
          rotte: rotte.filter(r => r.reteDestinazione && r.gateway),
        }
      }
      const res = await fetch(`/api/impianti/${plant.id}/apparecchiature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      })
      if (res.ok) {
        const eq = await res.json()
        setApparecchiature(prev => [...prev, eq])
        eqForm.reset({ tipo: "EROGATORE", stato: "FUNZIONANTE" })
        resetSchedaState()
        toast.success("Apparecchiatura aggiunta")
      } else {
        toast.error("Errore durante l'aggiunta")
      }
    } finally { setAddingEq(false) }
  })

  const deleteApparecchiatura = async (id: string) => {
    if (!confirm("Eliminare questa apparecchiatura?")) return
    setDeletingEqId(id)
    try {
      const res = await fetch(`/api/apparecchiature/${id}`, { method: "DELETE" })
      if (res.ok) {
        setApparecchiature(prev => prev.filter(e => e.id !== id))
        toast.success("Apparecchiatura eliminata")
      } else { toast.error("Errore durante l'eliminazione") }
    } finally { setDeletingEqId(null) }
  }

  // ── Rete form ────────────────────────────────────────────────────────────────
  const reteForm = useForm<ReteData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ReteSchema) as any,
    defaultValues: { tipoDispositivo: "PC" },
  })

  const addDevice = reteForm.handleSubmit(async (data: ReteData) => {
    setAddingDev(true)
    try {
      const res = await fetch(`/api/impianti/${plant.id}/network`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const dev = await res.json()
        setDevices(prev => [...prev, dev])
        reteForm.reset({ tipoDispositivo: "PC" })
        toast.success("Dispositivo aggiunto")
      } else {
        toast.error("Errore durante l'aggiunta")
      }
    } finally { setAddingDev(false) }
  })

  const deleteDevice = async (id: string) => {
    if (!confirm("Eliminare questo dispositivo?")) return
    setDeletingDevId(id)
    try {
      const res = await fetch(`/api/network/${id}`, { method: "DELETE" })
      if (res.ok) {
        setDevices(prev => prev.filter(d => d.id !== id))
        toast.success("Dispositivo eliminato")
      } else { toast.error("Errore durante l'eliminazione") }
    } finally { setDeletingDevId(null) }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <Tabs defaultValue="generale" className="space-y-4">
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="generale">Dati generali</TabsTrigger>
        <TabsTrigger value="parti">Proprietario / Gestore</TabsTrigger>
        <TabsTrigger value="apparecchiature">Apparecchiature</TabsTrigger>
        <TabsTrigger value="rete">Rete</TabsTrigger>
      </TabsList>

      {/* ── Tab: Dati generali ────────────────────────────────────────────── */}
      <TabsContent value="generale">
        <form onSubmit={saveGenerale} className="space-y-5">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 space-y-4">
            <h2 className="font-semibold text-[var(--primary)]">Dati identificativi</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Indirizzo *</Label>
                <Input {...register("indirizzo")} className="mt-1" />
                {errors.indirizzo && <p className="text-xs text-destructive mt-1">{errors.indirizzo.message}</p>}
              </div>
              <div>
                <Label>Città *</Label>
                <Input {...register("citta")} className="mt-1" />
                {errors.citta && <p className="text-xs text-destructive mt-1">{errors.citta.message}</p>}
              </div>
              <div>
                <Label>Bandiera / Compagnia *</Label>
                <Select onValueChange={v => setValue("compagniaId", v)} defaultValue={plant.compagniaId ?? ""}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                  <SelectContent>{compagnie.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
                {errors.compagniaId && <p className="text-xs text-destructive mt-1">{errors.compagniaId.message}</p>}
              </div>
              <div>
                <Label>Provincia</Label>
                <Input {...register("provincia")} maxLength={2} className="mt-1 uppercase" />
                {errors.provincia && <p className="text-xs text-destructive mt-1">{errors.provincia.message}</p>}
              </div>
              <div>
                <Label>CAP</Label>
                <Input {...register("cap")} maxLength={5} className="mt-1" />
              </div>
              <div>
                <Label>Tipo impianto</Label>
                <Select onValueChange={v => setValue("tipoImpianto", v)} defaultValue={plant.tipoImpianto ?? "STRADALE"}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["STRADALE","AUTOSTRADALE","PRIVATO","INDUSTRIALE","NAUTICO","AEROPORTUALE"].map(t => (
                      <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase().replace("_"," ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stato</Label>
                <Select onValueChange={v => setValue("stato", v)} defaultValue={plant.stato ?? "ATTIVO"}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATTIVO">Attivo</SelectItem>
                    <SelectItem value="INATTIVO">Inattivo</SelectItem>
                    <SelectItem value="DISMESSO">Dismesso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <h3 className="text-sm font-medium text-[var(--muted-foreground)]">Dati opzionali</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Codice interno</Label><Input {...register("codice")} className="mt-1" /></div>
              <div><Label>Alias</Label><Input {...register("alias")} className="mt-1" /></div>
              <div><Label>Codice impianto compagnia</Label><Input {...register("codiceImpiantoCompagnia")} className="mt-1" /></div>
              <div><Label>Ispettore di zona</Label><Input {...register("ispettoreZona")} className="mt-1" /></div>
              <div><Label>N° autorizzazione</Label><Input {...register("numeroAutorizzazione")} className="mt-1" /></div>
              <div><Label>Data apertura</Label><Input type="date" {...register("dataApertura")} className="mt-1" /></div>
              <div className="sm:col-span-2">
                <Label>Note generali</Label>
                <textarea {...register("noteGenerali")} rows={3}
                  className="mt-1 flex w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] resize-none" />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Salvataggio...</> : <><Save className="h-4 w-4 mr-1" />Salva dati generali</>}
            </Button>
          </div>
        </form>
      </TabsContent>

      {/* ── Tab: Proprietario / Gestore ───────────────────────────────────── */}
      <TabsContent value="parti">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 space-y-6">
          <div className="space-y-3">
            <h2 className="font-semibold text-[var(--primary)]">Proprietario</h2>
            <AnagraficaSearch label="proprietario" value={proprietario} onChange={setProprietario} />
          </div>
          <Separator />
          <div className="space-y-3">
            <h2 className="font-semibold text-[var(--primary)]">Gestore</h2>
            <AnagraficaSearch label="gestore" value={gestore} onChange={setGestore} />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Referente per la manutenzione</Label>
            <Select value={clienteManutenzione} onValueChange={setClienteManutenzione}>
              <SelectTrigger><SelectValue placeholder="Nessuno specificato" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NESSUNO">Nessuno specificato</SelectItem>
                <SelectItem value="PROPRIETARIO">Proprietario</SelectItem>
                <SelectItem value="GESTORE">Gestore</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => saveGenerale()}
              disabled={saving}
            >
              {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Salvataggio...</> : <><Save className="h-4 w-4 mr-1" />Salva proprietario / gestore</>}
            </Button>
          </div>
        </div>
      </TabsContent>

      {/* ── Tab: Apparecchiature ──────────────────────────────────────────── */}
      <TabsContent value="apparecchiature">
        <div className="space-y-4">
          {/* Existing */}
          {apparecchiature.length > 0 && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
              {apparecchiature.map(eq => (
                <div key={eq.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{tipoApparecchioLabel[eq.tipo] ?? eq.tipo}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {[eq.marca, eq.modello, eq.matricola, eq.posizione].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-white shrink-0"
                    onClick={() => deleteApparecchiatura(eq.id)}
                    disabled={deletingEqId === eq.id}
                  >
                    {deletingEqId === eq.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add form */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 space-y-4">
            <h2 className="font-semibold text-[var(--primary)] flex items-center gap-2">
              <Plus className="h-4 w-4" />Aggiungi apparecchiatura
            </h2>
            <form onSubmit={addApparecchiatura} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo *</Label>
                  <Select onValueChange={v => eqForm.setValue("tipo", v)} defaultValue="EROGATORE">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(tipoApparecchioLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Stato</Label>
                  <Select onValueChange={v => eqForm.setValue("stato", v)} defaultValue="FUNZIONANTE">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FUNZIONANTE">Funzionante</SelectItem>
                      <SelectItem value="GUASTO">Guasto</SelectItem>
                      <SelectItem value="IN_MANUTENZIONE">In manutenzione</SelectItem>
                      <SelectItem value="DISMESSO">Dismesso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Marca</Label><Input {...eqForm.register("marca")} className="mt-1" placeholder="es. Gilbarco" /></div>
                <div><Label>Modello</Label><Input {...eqForm.register("modello")} className="mt-1" placeholder="es. Encore 700S" /></div>
                <div><Label>Matricola</Label><Input {...eqForm.register("matricola")} className="mt-1" /></div>
                <div><Label>Posizione</Label><Input {...eqForm.register("posizione")} className="mt-1" placeholder="es. Isola 1 lato A" /></div>
                <div className="sm:col-span-2"><Label>Note</Label><Input {...eqForm.register("note")} className="mt-1" /></div>

                {eqTipo === "COLONNINA_PAGAMENTO" && (<>
                  <div className="sm:col-span-2"><Separator /><p className="text-sm font-semibold text-[var(--primary)] pt-1">Terminale Bancario</p></div>
                  <div><Label>Codice terminale</Label><Input {...eqForm.register("terminaleBank.codiceTerminale" as any)} className="mt-1" placeholder="es. 12345678" /></div>
                  <div><Label>Banca / Circuito</Label><Input {...eqForm.register("terminaleBank.bancaCircuito" as any)} className="mt-1" placeholder="es. Nexi, CartaSì" /></div>
                  <div><Label>Tipo connessione</Label><Input {...eqForm.register("terminaleBank.tipoConnessione" as any)} className="mt-1" placeholder="es. TCP/IP, VPN SSL" /></div>
                  <div>
                    <Label>Framing messaggi</Label>
                    <Select onValueChange={v => eqForm.setValue("terminaleBank.framingMessaggi" as any, v || null)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BT">BT</SelectItem>
                        <SelectItem value="TESTATA_IP">Testata IP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Indirizzo IP terminale bancario</Label><Input {...eqForm.register("terminaleBank.indirizzoIp" as any)} className="mt-1 font-mono" placeholder="192.168.1.100" /></div>
                  <div><Label>Porta terminale bancario</Label><Input type="number" {...eqForm.register("terminaleBank.porta" as any)} className="mt-1" placeholder="es. 8080" /></div>

                  <div className="sm:col-span-2"><Separator /><p className="text-sm font-semibold text-[var(--primary)] pt-1">Terminale Petrolio</p></div>
                  <div><Label>Codice terminale</Label><Input {...eqForm.register("terminalePetrolio.codiceTerminale" as any)} className="mt-1" placeholder="es. PET001" /></div>
                  <div><Label>Protocollo comunicazione</Label><Input {...eqForm.register("terminalePetrolio.protocolloComunicazione" as any)} className="mt-1" placeholder="es. IFSF, Tokheim" /></div>
                  <div><Label>Indirizzo IP terminale petrolio</Label><Input {...eqForm.register("terminalePetrolio.indirizzoIp" as any)} className="mt-1 font-mono" placeholder="192.168.1.101" /></div>
                  <div><Label>Porta terminale petrolio</Label><Input type="number" {...eqForm.register("terminalePetrolio.porta" as any)} className="mt-1" placeholder="es. 1024" /></div>
                </>)}

                {eqTipo === "GESTIONALE" && (<>
                  <div className="sm:col-span-2"><Separator /><p className="text-sm font-semibold text-[var(--primary)] pt-1">Accesso al sistema</p></div>
                  <div><Label>IP PC</Label><Input value={schedaFields.indirizzoIpPc} onChange={e => setSchedaFields(f => ({...f, indirizzoIpPc: e.target.value}))} className="mt-1 font-mono" placeholder="192.168.1.10" /></div>
                  <div><Label>Username sistema</Label><Input value={schedaFields.usernameSistema} onChange={e => setSchedaFields(f => ({...f, usernameSistema: e.target.value}))} className="mt-1" /></div>
                  <div><Label>Password sistema</Label><Input type="password" value={schedaFields.passwordSistema} onChange={e => setSchedaFields(f => ({...f, passwordSistema: e.target.value}))} className="mt-1" /></div>
                  <div><Label>Password Pumapro</Label><Input type="password" value={schedaFields.passwordPumapro} onChange={e => setSchedaFields(f => ({...f, passwordPumapro: e.target.value}))} className="mt-1" /></div>
                  <div><Label>Password Admin</Label><Input type="password" value={schedaFields.passwordAdmin} onChange={e => setSchedaFields(f => ({...f, passwordAdmin: e.target.value}))} className="mt-1" /></div>
                  <div><Label>Tipo accesso remoto</Label><Input value={schedaFields.tipoAccessoRemoto} onChange={e => setSchedaFields(f => ({...f, tipoAccessoRemoto: e.target.value}))} className="mt-1" placeholder="es. TeamViewer, RDP, VNC" /></div>
                  <div><Label>Porta accesso remoto</Label><Input type="number" value={schedaFields.portaAccessoRemoto} onChange={e => setSchedaFields(f => ({...f, portaAccessoRemoto: e.target.value}))} className="mt-1" /></div>

                  <div className="sm:col-span-2"><Separator /><p className="text-sm font-semibold text-[var(--primary)] pt-1">Configurazione di rete</p></div>
                  <div><Label>Subnet mask</Label><Input value={schedaFields.subnetMask} onChange={e => setSchedaFields(f => ({...f, subnetMask: e.target.value}))} className="mt-1 font-mono" placeholder="255.255.255.0" /></div>
                  <div><Label>Gateway</Label><Input value={schedaFields.gateway} onChange={e => setSchedaFields(f => ({...f, gateway: e.target.value}))} className="mt-1 font-mono" placeholder="192.168.1.1" /></div>
                  <div><Label>DNS primario</Label><Input value={schedaFields.dnsPrimario} onChange={e => setSchedaFields(f => ({...f, dnsPrimario: e.target.value}))} className="mt-1 font-mono" placeholder="8.8.8.8" /></div>
                  <div><Label>DNS secondario</Label><Input value={schedaFields.dnsSecondario} onChange={e => setSchedaFields(f => ({...f, dnsSecondario: e.target.value}))} className="mt-1 font-mono" placeholder="8.8.4.4" /></div>
                  <div><Label>Tipo rete</Label><Input value={schedaFields.tipoRete} onChange={e => setSchedaFields(f => ({...f, tipoRete: e.target.value}))} className="mt-1" placeholder="es. ADSL, Fibra, 4G" /></div>

                  <div className="sm:col-span-2"><Separator /><p className="text-sm font-semibold text-[var(--primary)] pt-1">Software</p></div>
                  <div><Label>Versione software</Label><Input value={schedaFields.versioneSoftware} onChange={e => setSchedaFields(f => ({...f, versioneSoftware: e.target.value}))} className="mt-1" /></div>
                  <div><Label>Numero licenza</Label><Input value={schedaFields.numeroLicenza} onChange={e => setSchedaFields(f => ({...f, numeroLicenza: e.target.value}))} className="mt-1" /></div>
                  <div><Label>Scadenza licenza</Label><Input type="date" value={schedaFields.scadenzaLicenza} onChange={e => setSchedaFields(f => ({...f, scadenzaLicenza: e.target.value}))} className="mt-1" /></div>

                  <div className="sm:col-span-2"><Separator /><p className="text-sm font-semibold text-[var(--primary)] pt-1">Rotte statiche</p></div>
                  {rotte.length > 0 && (
                    <div className="sm:col-span-2 space-y-1">
                      {rotte.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs font-mono bg-muted/30 rounded px-3 py-1.5">
                          <span className="flex-1">{r.reteDestinazione} → {r.gateway}</span>
                          <button type="button" onClick={() => setRotte(prev => prev.filter((_, j) => j !== i))} className="text-destructive hover:text-destructive/80"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div><Label>IP destinazione</Label><Input value={newRotta.ip} onChange={e => setNewRotta(r => ({...r, ip: e.target.value}))} className="mt-1 font-mono" placeholder="192.168.10.0" /></div>
                  <div><Label>Subnet mask</Label><Input value={newRotta.subnetMask} onChange={e => setNewRotta(r => ({...r, subnetMask: e.target.value}))} className="mt-1 font-mono" placeholder="255.255.255.0" /></div>
                  <div><Label>Gateway</Label><Input value={newRotta.gateway} onChange={e => setNewRotta(r => ({...r, gateway: e.target.value}))} className="mt-1 font-mono" placeholder="192.168.1.1" /></div>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" size="sm" onClick={addRotta} className="mt-1 w-full">
                      <Plus className="h-3.5 w-3.5 mr-1" />Aggiungi rotta
                    </Button>
                  </div>
                </>)}
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={addingEq}>
                  {addingEq ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Aggiunta...</> : <><Plus className="h-4 w-4 mr-1" />Aggiungi</>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </TabsContent>

      {/* ── Tab: Rete ─────────────────────────────────────────────────────── */}
      <TabsContent value="rete">
        <div className="space-y-4">
          {/* Existing */}
          {devices.length > 0 && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
              {devices.map(dev => (
                <div key={dev.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{dev.etichetta}</p>
                    <p className="text-xs text-[var(--muted-foreground)] font-mono">
                      {tipoDispositivoLabel[dev.tipoDispositivo] ?? dev.tipoDispositivo} · {dev.indirizzoIp}
                      {dev.macAddress ? ` · ${dev.macAddress}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-white shrink-0"
                    onClick={() => deleteDevice(dev.id)}
                    disabled={deletingDevId === dev.id}
                  >
                    {deletingDevId === dev.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add form */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 space-y-4">
            <h2 className="font-semibold text-[var(--primary)] flex items-center gap-2">
              <Plus className="h-4 w-4" />Aggiungi dispositivo di rete
            </h2>
            <form onSubmit={addDevice} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Etichetta *</Label>
                  <Input {...reteForm.register("etichetta")} className="mt-1" placeholder="es. Router principale" />
                  {reteForm.formState.errors.etichetta && <p className="text-xs text-destructive mt-1">{reteForm.formState.errors.etichetta.message}</p>}
                </div>
                <div>
                  <Label>Tipo dispositivo</Label>
                  <Select onValueChange={v => reteForm.setValue("tipoDispositivo", v)} defaultValue="PC">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(tipoDispositivoLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Indirizzo IP *</Label>
                  <Input {...reteForm.register("indirizzoIp")} className="mt-1 font-mono" placeholder="192.168.1.1" />
                  {reteForm.formState.errors.indirizzoIp && <p className="text-xs text-destructive mt-1">{reteForm.formState.errors.indirizzoIp.message}</p>}
                </div>
                <div>
                  <Label>MAC Address</Label>
                  <Input {...reteForm.register("macAddress")} className="mt-1 font-mono" placeholder="AA:BB:CC:DD:EE:FF" />
                </div>
                <div className="sm:col-span-2"><Label>Note</Label><Input {...reteForm.register("note")} className="mt-1" /></div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={addingDev}>
                  {addingDev ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Aggiunta...</> : <><Plus className="h-4 w-4 mr-1" />Aggiungi</>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
