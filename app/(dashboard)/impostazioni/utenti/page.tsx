import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { UtentiClient } from "@/components/utenti/utenti-client"

export default async function UtentiPage() {
  const session = await auth()
  const userRole = (session?.user as { ruolo?: string })?.ruolo
  if (userRole !== "ADMIN") redirect("/")

  let utenti: Array<{ id: string; nome: string; cognome: string; email: string; ruolo: string; attivo: boolean; ultimoAccesso: Date | null; createdAt: Date }> = []
  try {
    utenti = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, nome: true, cognome: true, email: true, ruolo: true, attivo: true, ultimoAccesso: true, createdAt: true } })
  } catch { /* DB not ready */ }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--primary)]">Gestione Utenti</h1>
        <p className="text-sm text-muted-foreground mt-1">Invita e gestisci gli utenti del sistema.</p>
      </div>
      <UtentiClient utenti={utenti} currentUserId={session!.user!.id as string} />
    </div>
  )
}
