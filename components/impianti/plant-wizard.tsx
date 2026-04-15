"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  CheckCircle2, ChevronRight, ChevronLeft,
  Save, Loader2, Plus, Trash2, Search, X, User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { tipoApparecchioLabel, tipoDispositivoLabel } from "@/lib/labels"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Compagnia { id: string; nome: string }
interface Anagrafica { id: string; ragioneSociale: string }
interface PlantWizardProps { compagnie: Compagnia[] }

// ─── Schemas ──────────────────────────────────────────────────────────────────
const Step1Schema = z.object({
  indirizzo: z.string().min(1, "Indirizzo richiesto"),
  citta: z.string().min(1, "Città richiesta"),
  compagniaId: z.string().min(1, "Compagnia richiesta"),
  provincia: z.string().length(2, "Inserire sigla provincia (2 lettere)").transform(v => v.toUpperCase()),
  cap: z.string().optional(),
  codice: z.string().optional(),
  alias: z.string().optional(),
  tipoImpianto: z.string().default("STRADALE"),
  stato: z.string().default("ATTIVO"),
  numeroAutorizzazione: z.string().optional(),
  dataApertura: z.string().optional(),
  codiceImpiantoCompagnia: z.string().optional(),
  ispettoreZona: z.string().optional(),
})
type Step1Data = z.infer<typeof Step1Schema>

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

// ─── Step indicator ────────────────────────────────────────────────────────────
const STEPS = [
  { n: 1, label: "Dati base" },
  { n: 2, label: "Proprietario / Gestore" },
  { n: 3, label: "Apparecchiature" },
  { n: 4, label: "Rete" },
]

function StepIndicator({ current, maxReached }: { current: number; maxReached: number }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const done = s.n < current
        const active = s.n === current
        const reachable = s.n <= maxReached
        return (
          <div key={s.n} className="flex items-center shrink-0">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              active
                ? "bg-[var(--primary)] text-white"
                : done
                ? "bg-green-900/40 text-green-400"
                : reachable
                ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
                : "bg-[var(--muted)]/50 text-[var(--muted-foreground)]/50"
            }`}>
              {done
                ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                : <span className="text-xs w-3.5 text-center">{s.n}</span>
              }
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-px mx-1 ${s.n < current ? "bg-green-700" : "bg-[var(--border)]"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Anagrafica search ─────────────────────────────────────────────────────────
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
        <button type="button" onClick={() => onChange(null)} className="text-[var(--muted-foreground)] hover:text-destructive">
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
              key={r.id}
              type="button"
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

// ─── Main wizard ───────────────────────────────────────────────────────────────
export function PlantWizard({ compagnie }: PlantWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [maxReached, setMaxReached] = useState(1)
  const [plantId, setPlantId] = useState<string | null>(null)
  // Full plant data from step 1 response — needed to re-send required fields in step 2 PUT
  const [plantBase, setPlantBase] = useState<Record<string, unknown> | null>(null)
  const [saving, setSaving] = useState(false)

  // Step 2 state
  const [proprietario, setProprietario] = useState<Anagrafica | null>(null)
  const [gestore, setGestore] = useState<Anagrafica | null>(null)
  const [clienteManutenzione, setClienteManutenzione] = useState("")

  // Step 3 state
  const [apparecchiature, setApparecchiature] = useState<{ id: string; tipo: string; marca: string | null; modello: string | null; matricola: string | null; posizione: string | null; stato: string }[]>([])
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

  // Step 4 state
  const [devices, setDevices] = useState<{ id: string; etichetta: string; tipoDispositivo: string; indirizzoIp: string; macAddress: string | null }[]>([])
  const [addingDev, setAddingDev] = useState(false)
  const [deletingDevId, setDeletingDevId] = useState<string | null>(null)

  // ── Step 1 form ──────────────────────────────────────────────────────────────
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Step1Data>({
    resolver: zodResolver(Step1Schema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: { tipoImpianto: "STRADALE", stato: "ATTIVO" },
  })
  const compagniaId = watch("compagniaId")

  const goTo = (n: number) => {
    if (n <= maxReached) { setStep(n) }
  }

  const advanceTo = (n: number) => {
    setStep(n)
    if (n > maxReached) setMaxReached(n)
  }

  // Step 1 → create plant
  const submitStep1 = handleSubmit(async (data: Step1Data) => {
    setSaving(true)
    try {
      const res = await fetch("/api/impianti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          dataApertura: data.dataApertura ? new Date(data.dataApertura).toISOString() : null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (res.status === 409) { toast.error("Codice impianto già esistente"); return }
        toast.error(typeof err.error === "string" ? err.error : "Errore durante la creazione")
        return
      }
      const plant = await res.json()
      setPlantId(plant.id)
      setPlantBase(plant)
      toast.success("Impianto creato")
      advanceTo(2)
    } catch {
      toast.error("Errore di rete")
    } finally {
      setSaving(false)
    }
  })

  // Step 2 → save proprietario/gestore (merged with stored plant base data)
  const submitStep2 = async (skip = false) => {
    if (!plantId) return
    if (skip) { advanceTo(3); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/impianti/${plantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...plantBase,
          proprietarioId: proprietario?.id ?? null,
          gestoreId: gestore?.id ?? null,
          clienteManutenzione: clienteManutenzione || null,
        }),
      })
      if (res.ok) {
        toast.success("Dati salvati")
        advanceTo(3)
      } else {
        toast.error("Errore durante il salvataggio")
      }
    } catch {
      toast.error("Errore di rete")
    } finally {
      setSaving(false)
    }
  }

  // Step 3 — apparecchiature
  const eqForm = useForm<ApparecchiaturaData>({
    resolver: zodResolver(ApparecchiaturaSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: { tipo: "EROGATORE", stato: "FUNZIONANTE" },
  })
  const eqTipo = eqForm.watch("tipo")

  const addApparecchiatura = eqForm.handleSubmit(async (data: ApparecchiaturaData) => {
    if (!plantId) return
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
      const res = await fetch(`/api/impianti/${plantId}/apparecchiature`, {
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
    } catch {
      toast.error("Errore di rete")
    } finally {
      setAddingEq(false)
    }
  })

  const deleteApparecchiatura = async (id: string) => {
    if (!confirm("Eliminare questa apparecchiatura?")) return
    setDeletingEqId(id)
    try {
      const res = await fetch(`/api/apparecchiature/${id}`, { method: "DELETE" })
      if (res.ok) {
        setApparecchiature(prev => prev.filter(e => e.id !== id))
        toast.success("Eliminata")
      } else { toast.error("Errore durante l'eliminazione") }
    } finally { setDeletingEqId(null) }
  }

  // Step 4 — rete
  const reteForm = useForm<ReteData>({
    resolver: zodResolver(ReteSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: { tipoDispositivo: "PC" },
  })

  const addDevice = reteForm.handleSubmit(async (data: ReteData) => {
    if (!plantId) return
    setAddingDev(true)
    try {
      const res = await fetch(`/api/impianti/${plantId}/network`, {
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
    } catch {
      toast.error("Errore di rete")
    } finally {
      setAddingDev(false)
    }
  })

  const deleteDevice = async (id: string) => {
    if (!confirm("Eliminare questo dispositivo?")) return
    setDeletingDevId(id)
    try {
      const res = await fetch(`/api/network/${id}`, { method: "DELETE" })
      if (res.ok) {
        setDevices(prev => prev.filter(d => d.id !== id))
        toast.success("Eliminato")
      } else { toast.error("Errore durante l'eliminazione") }
    } finally { setDeletingDevId(null) }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Step indicator — clickable after unlocking */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <StepIndicator current={step} maxReached={maxReached} />
          {plantId && (
            <a
              href={`/impianti/${plantId}`}
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] whitespace-nowrap underline underline-offset-2"
            >
              Vai alla scheda
            </a>
          )}
        </div>
      </div>

      {/* ── Step 1: Dati base ──────────────────────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={submitStep1} className="space-y-5">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 space-y-4">
            <h2 className="font-semibold text-[var(--primary)]">Dati identificativi</h2>
            <p className="text-xs text-[var(--muted-foreground)]">I campi con * sono obbligatori.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="indirizzo">Indirizzo *</Label>
                <Input id="indirizzo" placeholder="Via Roma 1" {...register("indirizzo")} className="mt-1" />
                {errors.indirizzo && <p className="text-xs text-destructive mt-1">{errors.indirizzo.message}</p>}
              </div>
              <div>
                <Label htmlFor="citta">Città *</Label>
                <Input id="citta" placeholder="Milano" {...register("citta")} className="mt-1" />
                {errors.citta && <p className="text-xs text-destructive mt-1">{errors.citta.message}</p>}
              </div>
              <div>
                <Label htmlFor="compagniaId">Bandiera / Compagnia *</Label>
                <Select onValueChange={v => setValue("compagniaId", v)} value={compagniaId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleziona compagnia..." />
                  </SelectTrigger>
                  <SelectContent>
                    {compagnie.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.compagniaId && <p className="text-xs text-destructive mt-1">{errors.compagniaId.message}</p>}
              </div>
              <div>
                <Label htmlFor="provincia">Provincia *</Label>
                <Input id="provincia" placeholder="MI" minLength={2} maxLength={2} {...register("provincia")} className="mt-1 uppercase" />
                {errors.provincia && <p className="text-xs text-destructive mt-1">{errors.provincia.message}</p>}
              </div>
              <div>
                <Label htmlFor="cap">CAP</Label>
                <Input id="cap" placeholder="20100" maxLength={5} {...register("cap")} className="mt-1" />
              </div>
              <div>
                <Label>Tipo impianto</Label>
                <Select onValueChange={v => setValue("tipoImpianto", v)} defaultValue="STRADALE">
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["STRADALE","AUTOSTRADALE","PRIVATO","INDUSTRIALE","NAUTICO","AEROPORTUALE"].map(t => (
                      <SelectItem key={t} value={t}>{t.charAt(0)+t.slice(1).toLowerCase().replace("_"," ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stato</Label>
                <Select onValueChange={v => setValue("stato", v)} defaultValue="ATTIVO">
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
              <div><Label>Codice interno</Label><Input placeholder="IMP0001" {...register("codice")} className="mt-1" /></div>
              <div><Label>Alias</Label><Input placeholder="Ex-Agip angolo semaforo" {...register("alias")} className="mt-1" /></div>
              <div><Label>Codice impianto compagnia</Label><Input {...register("codiceImpiantoCompagnia")} className="mt-1" /></div>
              <div><Label>Ispettore di zona</Label><Input {...register("ispettoreZona")} className="mt-1" /></div>
              <div><Label>N° autorizzazione</Label><Input {...register("numeroAutorizzazione")} className="mt-1" /></div>
              <div><Label>Data apertura</Label><Input type="date" {...register("dataApertura")} className="mt-1" /></div>
            </div>
          </div>

          <div className="flex justify-between gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/impianti")}>Annulla</Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Creazione...</>
                : <>Crea impianto <ChevronRight className="h-4 w-4 ml-1" /></>}
            </Button>
          </div>
        </form>
      )}

      {/* ── Step 2: Proprietario / Gestore ────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 space-y-5">
            <div>
              <h2 className="font-semibold text-[var(--primary)] mb-1">Proprietario</h2>
              <p className="text-xs text-[var(--muted-foreground)] mb-3">Cerca per ragione sociale tra i clienti registrati.</p>
              <AnagraficaSearch label="proprietario" value={proprietario} onChange={setProprietario} />
            </div>
            <Separator />
            <div>
              <h2 className="font-semibold text-[var(--primary)] mb-1">Gestore</h2>
              <p className="text-xs text-[var(--muted-foreground)] mb-3">Lascia vuoto se coincide con il proprietario.</p>
              <AnagraficaSearch label="gestore" value={gestore} onChange={setGestore} />
            </div>
            <Separator />
            <div>
              <Label>Referente per la manutenzione</Label>
              <Select value={clienteManutenzione} onValueChange={setClienteManutenzione}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Nessuno specificato" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nessuno specificato</SelectItem>
                  <SelectItem value="PROPRIETARIO">Proprietario</SelectItem>
                  <SelectItem value="GESTORE">Gestore</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between gap-3">
            <Button type="button" variant="outline" onClick={() => goTo(1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />Indietro
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => submitStep2(true)}>
                Salta
              </Button>
              <Button type="button" onClick={() => submitStep2(false)} disabled={saving}>
                {saving
                  ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Salvataggio...</>
                  : <><Save className="h-4 w-4 mr-1" />Salva e avanti</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Apparecchiature ────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          {/* Existing list */}
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
                    variant="ghost" size="sm"
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
                <Button type="submit" variant="outline" disabled={addingEq}>
                  {addingEq ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Aggiunta...</> : <><Plus className="h-4 w-4 mr-1" />Aggiungi</>}
                </Button>
              </div>
            </form>
          </div>

          <div className="flex justify-between gap-3">
            <Button type="button" variant="outline" onClick={() => goTo(2)}>
              <ChevronLeft className="h-4 w-4 mr-1" />Indietro
            </Button>
            <Button type="button" onClick={() => advanceTo(4)}>
              {apparecchiature.length > 0 ? "Avanti" : "Salta"} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Rete ──────────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-5">
          {/* Existing list */}
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
                    variant="ghost" size="sm"
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
                <Button type="submit" variant="outline" disabled={addingDev}>
                  {addingDev ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Aggiunta...</> : <><Plus className="h-4 w-4 mr-1" />Aggiungi</>}
                </Button>
              </div>
            </form>
          </div>

          <div className="flex justify-between gap-3">
            <Button type="button" variant="outline" onClick={() => goTo(3)}>
              <ChevronLeft className="h-4 w-4 mr-1" />Indietro
            </Button>
            <Button type="button" onClick={() => plantId && router.push(`/impianti/${plantId}`)}>
              <CheckCircle2 className="h-4 w-4 mr-1" />Vai alla scheda impianto
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
