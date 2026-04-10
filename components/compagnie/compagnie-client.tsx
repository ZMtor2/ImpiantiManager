"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"

interface Compagnia {
  id: string; nome: string; logoUrl: string | null; note: string | null
  _count: { impianti: number }
}

export function CompagnieClient({ compagnie: initial, isAdmin }: { compagnie: Compagnia[]; isAdmin: boolean }) {
  const router = useRouter()
  const [compagnie, setCompagnie] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [nome, setNome] = useState("")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Compagnia | null>(null)
  const [replaceId, setReplaceId] = useState("")
  const [deleting, setDeleting] = useState(false)

  const handleAdd = async () => {
    if (!nome.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/compagnie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), note: note.trim() || undefined }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? "Errore durante la creazione")
        return
      }
      const created = await res.json()
      setCompagnie(prev => [...prev, { ...created, _count: { impianti: 0 } }].sort((a, b) => a.nome.localeCompare(b.nome)))
      setNome(""); setNote(""); setShowAdd(false)
      toast.success("Compagnia creata")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/compagnie/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(replaceId ? { replaceWithId: replaceId } : {}),
      })
      if (!res.ok) {
        toast.error("Errore durante l'eliminazione")
        return
      }
      setCompagnie(prev => prev.filter(c => c.id !== deleteTarget.id))
      setDeleteTarget(null); setReplaceId("")
      toast.success("Compagnia eliminata")
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" />Nuova compagnia
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {compagnie.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground bg-[var(--card)] border border-border rounded-lg">
            Nessuna compagnia. Aggiungine una per iniziare.
          </div>
        )}
        {compagnie.map((c) => (
          <Card key={c.id} className="relative group">
            <CardContent className="pt-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm shrink-0">
                {c.logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={c.logoUrl} alt={c.nome} className="w-12 h-12 rounded-full object-contain" />
                  : c.nome.slice(0, 2).toUpperCase()
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{c.nome}</p>
                <p className="text-xs text-muted-foreground">{c._count.impianti} impianti</p>
                {c.note && <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.note}</p>}
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setDeleteTarget(c)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova compagnia petrolifera</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Es. Eni/IP" className="mt-1" />
            </div>
            <div>
              <Label>Note</Label>
              <Input value={note} onChange={e => setNote(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annulla</Button>
            <Button onClick={handleAdd} disabled={saving || !nome.trim()}>
              {saving ? "Salvataggio..." : "Crea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina compagnia</DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-4">
              {deleteTarget._count.impianti > 0 ? (
                <>
                  <p className="text-sm">
                    La compagnia <strong>{deleteTarget.nome}</strong> è associata a <strong>{deleteTarget._count.impianti}</strong> impianti.
                  </p>
                  <div>
                    <Label>Sostituisci con (opzionale)</Label>
                    <select
                      className="w-full mt-1 border border-border rounded-md px-3 py-2 text-sm bg-background"
                      value={replaceId}
                      onChange={e => setReplaceId(e.target.value)}
                    >
                      <option value="">Rimuovi il riferimento</option>
                      {compagnie.filter(c => c.id !== deleteTarget.id).map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <p className="text-sm">Eliminare <strong>{deleteTarget.nome}</strong>? L&apos;operazione non è reversibile.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annulla</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminazione..." : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
