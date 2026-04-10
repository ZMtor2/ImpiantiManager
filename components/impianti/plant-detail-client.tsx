"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Trash2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface PlantDetailClientProps {
  plantId: string
  canWrite: boolean
}

export function PlantDetailClient({ plantId, canWrite }: PlantDetailClientProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Eliminare questo impianto? L'operazione non è reversibile.")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/impianti/${plantId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Impianto eliminato")
        router.push("/impianti")
        router.refresh()
      } else {
        toast.error("Errore durante l'eliminazione")
      }
    } finally {
      setDeleting(false)
    }
  }

  if (!canWrite) return null

  return (
    <div className="flex gap-2 shrink-0">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/impianti/${plantId}/modifica`}>
          <Pencil className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Modifica</span>
        </Link>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:bg-destructive hover:text-white"
        onClick={handleDelete}
        disabled={deleting}
      >
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline ml-1">Elimina</span>
      </Button>
    </div>
  )
}

