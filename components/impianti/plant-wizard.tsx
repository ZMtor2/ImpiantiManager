"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ChevronRight, ChevronLeft, CheckCircle2, SkipForward, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface Compagnia { id: string; nome: string }

interface PlantWizardProps {
  compagnie: Compagnia[]
}

const Step1Schema = z.object({
  indirizzo: z.string().min(1, "Indirizzo richiesto"),
  citta: z.string().min(1, "Città richiesta"),
  compagniaId: z.string().min(1, "Compagnia richiesta"),
  provincia: z.string().optional(),
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

const STEPS = [
  { number: 1, label: "Identificazione" },
  { number: 2, label: "Proprietario e Gestore" },
  { number: 3, label: "Apparecchiature" },
  { number: 4, label: "Rete" },
  { number: 5, label: "Foto" },
]

const TIPI_IMPIANTO = [
  { value: "STRADALE", label: "Stradale" },
  { value: "AUTOSTRADALE", label: "Autostradale" },
  { value: "PRIVATO", label: "Privato" },
  { value: "INDUSTRIALE", label: "Industriale" },
  { value: "NAUTICO", label: "Nautico" },
  { value: "AEROPORTUALE", label: "Aeroportuale" },
]

const STATI = [
  { value: "ATTIVO", label: "Attivo" },
  { value: "INATTIVO", label: "Inattivo" },
  { value: "DISMESSO", label: "Dismesso" },
]

export function PlantWizard({ compagnie }: PlantWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Step1Data>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(Step1Schema) as any,
    defaultValues: { tipoImpianto: "STRADALE", stato: "ATTIVO" },
  })

  const compagniaId = watch("compagniaId")

  const createPlant = useCallback(async (data: Step1Data) => {
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
        if (res.status === 409) {
          toast.error("Codice impianto già esistente")
          return null
        }
        toast.error(err.error ?? "Errore durante la creazione")
        return null
      }
      const plant = await res.json()
      return plant.id as string
    } finally {
      setSaving(false)
    }
  }, [])

  const onStep1Submit = handleSubmit(async (data: Step1Data) => {
    setStep1Data(data)
    setStep(2)
  })

  const saveAndComplete = handleSubmit(async (data: Step1Data) => {
    const id = await createPlant(data)
    if (id) {
      toast.success("Impianto creato con successo")
      router.push(`/impianti/${id}`)
    }
  })

  const finalCreate = async () => {
    if (!step1Data) return
    const id = await createPlant(step1Data)
    if (id) {
      toast.success("Impianto creato con successo")
      router.push(`/impianti/${id}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.number} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              step === s.number
                ? "bg-[var(--primary)] text-white"
                : step > s.number
                ? "bg-green-100 text-green-700"
                : "bg-muted text-muted-foreground"
            }`}>
              {step > s.number ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="text-xs">{s.number}</span>}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="w-4 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <form onSubmit={onStep1Submit} className="space-y-5">
          <div className="bg-[var(--card)] border border-border rounded-lg p-5 space-y-4">
            <h2 className="font-semibold text-[var(--primary)]">Dati identificativi</h2>
            <p className="text-xs text-muted-foreground">I campi con * sono obbligatori per procedere.</p>

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
                <Select onValueChange={(v) => setValue("compagniaId", v)} value={compagniaId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleziona compagnia..." />
                  </SelectTrigger>
                  <SelectContent>
                    {compagnie.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.compagniaId && <p className="text-xs text-destructive mt-1">{errors.compagniaId.message}</p>}
              </div>

              <div>
                <Label htmlFor="provincia">Provincia</Label>
                <Input id="provincia" placeholder="MI" maxLength={2} {...register("provincia")} className="mt-1 uppercase" />
              </div>

              <div>
                <Label htmlFor="cap">CAP</Label>
                <Input id="cap" placeholder="20100" maxLength={5} {...register("cap")} className="mt-1" />
              </div>
            </div>

            <Separator />
            <h3 className="text-sm font-medium text-muted-foreground">Dati opzionali</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codice">Codice interno</Label>
                <Input id="codice" placeholder="IMP0001" {...register("codice")} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="alias">Alias</Label>
                <Input id="alias" placeholder="Ex-Agip angolo semaforo" {...register("alias")} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="tipoImpianto">Tipo impianto</Label>
                <Select onValueChange={(v) => setValue("tipoImpianto", v)} defaultValue="STRADALE">
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPI_IMPIANTO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="stato">Stato</Label>
                <Select onValueChange={(v) => setValue("stato", v)} defaultValue="ATTIVO">
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATI.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="codiceImpiantoCompagnia">Codice impianto compagnia</Label>
                <Input id="codiceImpiantoCompagnia" {...register("codiceImpiantoCompagnia")} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="ispettoreZona">Ispettore di zona</Label>
                <Input id="ispettoreZona" {...register("ispettoreZona")} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="numeroAutorizzazione">N° autorizzazione</Label>
                <Input id="numeroAutorizzazione" {...register("numeroAutorizzazione")} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="dataApertura">Data apertura</Label>
                <Input id="dataApertura" type="date" {...register("dataApertura")} className="mt-1" />
              </div>
            </div>
          </div>

          <div className="flex justify-between gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/impianti")}>Annulla</Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={saveAndComplete} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />Salva e completa dopo
              </Button>
              <Button type="submit">
                Avanti <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Step 2 — Proprietario e Gestore (simplified) */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="bg-[var(--card)] border border-border rounded-lg p-5 space-y-4">
            <h2 className="font-semibold text-[var(--primary)]">Proprietario e Gestore</h2>
            <p className="text-sm text-muted-foreground">
              Potrai aggiungere proprietario e gestore dalla scheda impianto dopo la creazione.
              Per ora puoi saltare questo passaggio.
            </p>
          </div>
          <WizardNavigation step={step} totalSteps={5} onBack={() => setStep(1)} onNext={() => setStep(3)} onSkip={() => setStep(3)} onSaveComplete={finalCreate} saving={saving} />
        </div>
      )}

      {/* Step 3 — Apparecchiature (simplified) */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="bg-[var(--card)] border border-border rounded-lg p-5 space-y-4">
            <h2 className="font-semibold text-[var(--primary)]">Apparecchiature</h2>
            <p className="text-sm text-muted-foreground">
              Potrai aggiungere apparecchiature dalla scheda impianto dopo la creazione.
              Per ora puoi saltare questo passaggio.
            </p>
          </div>
          <WizardNavigation step={step} totalSteps={5} onBack={() => setStep(2)} onNext={() => setStep(4)} onSkip={() => setStep(4)} onSaveComplete={finalCreate} saving={saving} />
        </div>
      )}

      {/* Step 4 — Rete */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="bg-[var(--card)] border border-border rounded-lg p-5 space-y-4">
            <h2 className="font-semibold text-[var(--primary)]">Registro di rete</h2>
            <p className="text-sm text-muted-foreground">
              Potrai aggiungere dispositivi di rete dalla scheda impianto dopo la creazione.
            </p>
          </div>
          <WizardNavigation step={step} totalSteps={5} onBack={() => setStep(3)} onNext={() => setStep(5)} onSkip={() => setStep(5)} onSaveComplete={finalCreate} saving={saving} />
        </div>
      )}

      {/* Step 5 — Foto */}
      {step === 5 && (
        <div className="space-y-5">
          <div className="bg-[var(--card)] border border-border rounded-lg p-5 space-y-4">
            <h2 className="font-semibold text-[var(--primary)]">Foto</h2>
            <p className="text-sm text-muted-foreground">
              Potrai caricare foto dalla scheda impianto dopo la creazione.
            </p>
          </div>
          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setStep(4)}>
              <ChevronLeft className="h-4 w-4 mr-1" />Indietro
            </Button>
            <Button onClick={finalCreate} disabled={saving}>
              {saving ? "Creazione..." : "Crea impianto"}
              <CheckCircle2 className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function WizardNavigation({
  step, totalSteps, onBack, onNext, onSkip, onSaveComplete, saving
}: {
  step: number; totalSteps: number; onBack: () => void; onNext: () => void; onSkip: () => void; onSaveComplete: () => void; saving: boolean
}) {
  return (
    <div className="flex justify-between gap-3">
      <Button variant="outline" onClick={onBack}>
        <ChevronLeft className="h-4 w-4 mr-1" />Indietro
      </Button>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onSkip}>
          <SkipForward className="h-4 w-4 mr-1" />Salta
        </Button>
        <Button variant="outline" onClick={onSaveComplete} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />Salva e completa dopo
        </Button>
        {step < totalSteps && (
          <Button onClick={onNext}>
            Avanti <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}
