"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface Contact {
  id?: string; nome: string; ruolo: string; telefono: string; email: string; note: string
}

interface ClienteFormProps {
  initialData?: {
    id: string; ragioneSociale: string; partitaIva?: string | null; codiceFiscale?: string | null
    indirizzo?: string | null; citta?: string | null; provincia?: string | null; cap?: string | null; note?: string | null
    contatti: Contact[]
  }
}

export function ClienteForm({ initialData }: ClienteFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [ragioneSociale, setRagioneSociale] = useState(initialData?.ragioneSociale ?? "")
  const [partitaIva, setPartitaIva] = useState(initialData?.partitaIva ?? "")
  const [codiceFiscale, setCodiceFiscale] = useState(initialData?.codiceFiscale ?? "")
  const [indirizzo, setIndirizzo] = useState(initialData?.indirizzo ?? "")
  const [citta, setCitta] = useState(initialData?.citta ?? "")
  const [provincia, setProvincia] = useState(initialData?.provincia ?? "")
  const [cap, setCap] = useState(initialData?.cap ?? "")
  const [noteAna, setNoteAna] = useState(initialData?.note ?? "")
  const [contatti, setContatti] = useState<Contact[]>(initialData?.contatti ?? [])

  const addContact = () => setContatti(prev => [...prev, { nome: "", ruolo: "", telefono: "", email: "", note: "" }])
  const removeContact = (i: number) => setContatti(prev => prev.filter((_, j) => j !== i))
  const updateContact = (i: number, field: keyof Contact, value: string) => {
    setContatti(prev => prev.map((c, j) => j === i ? { ...c, [field]: value } : c))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ragioneSociale.trim()) { toast.error("Ragione sociale richiesta"); return }
    setSaving(true)
    try {
      const body = {
        ragioneSociale: ragioneSociale.trim(),
        partitaIva: partitaIva.trim() || null,
        codiceFiscale: codiceFiscale.trim() || null,
        indirizzo: indirizzo.trim() || null,
        citta: citta.trim() || null,
        provincia: provincia.trim() || null,
        cap: cap.trim() || null,
        note: noteAna.trim() || null,
        contatti: contatti.filter(c => c.nome.trim()).map(c => ({
          ...c,
          id: c.id,
          email: c.email || null,
          telefono: c.telefono || null,
          ruolo: c.ruolo || null,
          note: c.note || null,
        })),
      }
      const url = initialData ? `/api/anagrafica/${initialData.id}` : "/api/anagrafica"
      const method = initialData ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = typeof err.error === "string" ? err.error : "Errore durante il salvataggio"
        toast.error(msg)
        return
      }
      const data = await res.json()
      toast.success(initialData ? "Cliente aggiornato" : "Cliente creato")
      router.push(`/clienti/${data.id}`)
    } catch {
      toast.error("Errore di rete durante il salvataggio")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Dati anagrafici</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Ragione sociale *</Label>
            <Input value={ragioneSociale} onChange={e => setRagioneSociale(e.target.value)} className="mt-1" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Partita IVA</Label>
              <Input value={partitaIva} onChange={e => setPartitaIva(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Codice fiscale</Label>
              <Input value={codiceFiscale} onChange={e => setCodiceFiscale(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Indirizzo</Label>
            <Input value={indirizzo} onChange={e => setIndirizzo(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <Label>Città</Label>
              <Input value={citta} onChange={e => setCitta(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Provincia</Label>
              <Input value={provincia} onChange={e => setProvincia(e.target.value)} maxLength={2} className="mt-1 uppercase" />
            </div>
            <div>
              <Label>CAP</Label>
              <Input value={cap} onChange={e => setCap(e.target.value)} maxLength={5} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Note</Label>
            <textarea
              value={noteAna}
              onChange={e => setNoteAna(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Contatti</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addContact}>
              <Plus className="h-4 w-4 mr-1" />Aggiungi contatto
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {contatti.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nessun contatto. Aggiungine uno.</p>
          )}
          {contatti.map((c, i) => (
            <div key={i} className="border border-border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Contatto {i + 1}</p>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeContact(i)} className="text-muted-foreground hover:text-destructive h-7 w-7">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome *</Label>
                  <Input value={c.nome} onChange={e => updateContact(i, "nome", e.target.value)} className="mt-1 h-8" />
                </div>
                <div>
                  <Label className="text-xs">Ruolo</Label>
                  <Input value={c.ruolo} onChange={e => updateContact(i, "ruolo", e.target.value)} placeholder="Es. Referente tecnico" className="mt-1 h-8" />
                </div>
                <div>
                  <Label className="text-xs">Telefono</Label>
                  <Input value={c.telefono} onChange={e => updateContact(i, "telefono", e.target.value)} className="mt-1 h-8" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={c.email} onChange={e => updateContact(i, "email", e.target.value)} type="email" className="mt-1 h-8" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => router.back()}>Annulla</Button>
        <Button type="submit" disabled={saving}>{saving ? "Salvataggio..." : initialData ? "Aggiorna" : "Crea cliente"}</Button>
      </div>
    </form>
  )
}
