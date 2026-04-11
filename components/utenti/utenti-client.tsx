"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { it } from "date-fns/locale"

interface Utente { id: string; nome: string; cognome: string; email: string; ruolo: string; attivo: boolean; ultimoAccesso: Date | null; createdAt: Date }

interface UtentiClientProps { utenti: Utente[]; currentUserId: string }

const RUOLI = [{ value: "ADMIN", label: "Admin" }, { value: "TECNICO", label: "Tecnico" }, { value: "VIEWER", label: "Viewer" }]

export function UtentiClient({ utenti: initial, currentUserId }: UtentiClientProps) {
  const router = useRouter()
  const [utenti, setUtenti] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [showReset, setShowReset] = useState<Utente | null>(null)
  const [saving, setSaving] = useState(false)
  const [newNome, setNewNome] = useState("")
  const [newCognome, setNewCognome] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newRuolo, setNewRuolo] = useState("TECNICO")
  const [resetPassword, setResetPassword] = useState("")

  const handleCreate = async () => {
    if (!newEmail.trim() || !newPassword.trim() || !newNome.trim()) { toast.error("Compila tutti i campi obbligatori"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/utenti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: newNome, cognome: newCognome, email: newEmail, password: newPassword, ruolo: newRuolo }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        const msg = typeof e.error === "string" ? e.error : (e.error?.message ?? "Errore durante la creazione")
        toast.error(msg)
        return
      }
      const created = await res.json()
      setUtenti(prev => [...prev, { ultimoAccesso: null, ...created }])
      setShowAdd(false); setNewNome(""); setNewCognome(""); setNewEmail(""); setNewPassword(""); setNewRuolo("TECNICO")
      toast.success("Utente creato")
    } catch {
      toast.error("Errore di rete durante la creazione")
    } finally { setSaving(false) }
  }

  const handleRuoloChange = async (userId: string, ruolo: string) => {
    const res = await fetch(`/api/utenti/${userId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ruolo }) })
    if (res.ok) {
      setUtenti(prev => prev.map(u => u.id === userId ? { ...u, ruolo } : u))
      toast.success("Ruolo aggiornato")
    } else toast.error("Errore aggiornamento ruolo")
  }

  const handleToggleAttivo = async (userId: string, attivo: boolean) => {
    const res = await fetch(`/api/utenti/${userId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attivo }) })
    if (res.ok) {
      setUtenti(prev => prev.map(u => u.id === userId ? { ...u, attivo } : u))
      toast.success(attivo ? "Utente attivato" : "Utente disattivato")
    } else toast.error("Errore")
  }

  const handleDelete = async (userId: string, nome: string) => {
    if (!confirm(`Eliminare l'utente ${nome}? L'operazione non è reversibile.`)) return
    const res = await fetch(`/api/utenti/${userId}`, { method: "DELETE" })
    if (res.ok) {
      setUtenti(prev => prev.filter(u => u.id !== userId))
      toast.success("Utente eliminato")
    } else toast.error("Errore eliminazione")
  }

  const handleResetPassword = async () => {
    if (!showReset || !resetPassword.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/utenti/${showReset.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: resetPassword }) })
      if (res.ok) { toast.success("Password reimpostata"); setShowReset(null); setResetPassword("") }
      else toast.error("Errore durante il reset della password")
    } catch {
      toast.error("Errore di rete")
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" />Crea utente</Button>
      </div>

      <div className="bg-[var(--card)] border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Utente</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Ruolo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Ultimo accesso</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attivo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {utenti.map(u => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{u.nome} {u.cognome}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <Select value={u.ruolo} onValueChange={v => handleRuoloChange(u.id, v)} disabled={u.id === currentUserId}>
                    <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{RUOLI.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {u.ultimoAccesso ? formatDistanceToNow(new Date(u.ultimoAccesso), { addSuffix: true, locale: it }) : "Mai"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Switch checked={u.attivo} onCheckedChange={v => handleToggleAttivo(u.id, v)} disabled={u.id === currentUserId} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setShowReset(u)} title="Reset password">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    {u.id !== currentUserId && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(u.id, `${u.nome} ${u.cognome}`)} title="Elimina">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create user dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Crea nuovo utente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Nome *</Label><Input value={newNome} onChange={e => setNewNome(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-xs">Cognome</Label><Input value={newCognome} onChange={e => setNewCognome(e.target.value)} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Email *</Label><Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">Password *</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1" /></div>
            <div>
              <Label className="text-xs">Ruolo</Label>
              <Select value={newRuolo} onValueChange={setNewRuolo}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{RUOLI.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Creazione..." : "Crea"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!showReset} onOpenChange={() => setShowReset(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset password — {showReset?.nome} {showReset?.cognome}</DialogTitle></DialogHeader>
          <div><Label>Nuova password</Label><Input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="mt-1" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReset(null)}>Annulla</Button>
            <Button onClick={handleResetPassword} disabled={saving || !resetPassword.trim()}>{saving ? "Salvataggio..." : "Reimposta"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
