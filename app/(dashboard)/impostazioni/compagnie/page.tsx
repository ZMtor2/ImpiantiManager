import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { CompagnieClient } from "@/components/compagnie/compagnie-client"

export default async function CompagniePage() {
  const session = await auth()
  const userRole = (session?.user as { ruolo?: string })?.ruolo

  let compagnie: Array<{ id: string; nome: string; logoUrl: string | null; note: string | null; _count: { impianti: number } }> = []
  try {
    compagnie = await prisma.compagnia.findMany({
      orderBy: { nome: "asc" },
      include: { _count: { select: { impianti: true } } },
    })
  } catch { /* DB not ready */ }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--primary)]">Compagnie Petrolifere</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestisci le bandiere/compagnie degli impianti.</p>
      </div>
      <CompagnieClient compagnie={compagnie} isAdmin={userRole === "ADMIN"} />
    </div>
  )
}
