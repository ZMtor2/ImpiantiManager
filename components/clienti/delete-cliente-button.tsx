"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface Props {
  clienteId: string
  ragioneSociale: string
  impiantiCount: number
}

export function DeleteClienteButton({ clienteId, ragioneSociale, impiantiCount }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/anagrafica/${clienteId}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = typeof err.error === "string" ? err.error : "Errore durante l'eliminazione"
        toast.error(msg)
        return
      }
      toast.success("Cliente eliminato")
      router.push("/clienti")
    } catch {
      toast.error("Errore di rete durante l'eliminazione")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="text-destructive border-destructive/40 hover:bg-destructive/10">
        <Trash2 className="h-4 w-4 mr-1" />Elimina
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina cliente</DialogTitle>
            <DialogDescription>
              Stai per eliminare <strong>{ragioneSociale}</strong>.
              {impiantiCount > 0 && (
                <span className="block mt-2 text-yellow-500">
                  Attenzione: questo cliente è collegato a {impiantiCount} impianto/i.
                  Il collegamento verrà rimosso ma gli impianti non saranno eliminati.
                </span>
              )}
              <span className="block mt-2">L&apos;operazione non è reversibile.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>Annulla</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminazione..." : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
