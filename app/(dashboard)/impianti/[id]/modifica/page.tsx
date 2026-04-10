import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { PlantEditClient } from "@/components/impianti/plant-edit-client"

export default async function PlantEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userRole = (session?.user as { ruolo?: string })?.ruolo
  if (userRole !== "ADMIN" && userRole !== "TECNICO") redirect("/impianti")

  let plant = null
  let compagnie: { id: string; nome: string }[] = []

  try {
    ;[plant, compagnie] = await Promise.all([
      prisma.plant.findUnique({
        where: { id },
        include: {
          compagnia: true,
          proprietario: true,
          gestore: true,
          apparecchiature: {
            include: { pistole: true, terminaleBank: true, terminalePetrolio: true, schedaMacchina: true },
            orderBy: { tipo: "asc" },
          },
          networkDevices: { orderBy: { etichetta: "asc" } },
        },
      }),
      prisma.compagnia.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    ])
  } catch {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Errore nel caricamento dei dati.</p>
        <Button variant="outline" asChild className="mt-4"><Link href="/impianti">Torna agli impianti</Link></Button>
      </div>
    )
  }

  if (!plant) notFound()

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={`/impianti/${id}`}><ArrowLeft className="h-4 w-4 mr-1" />Torna alla scheda</Link>
        </Button>
        <h1 className="text-xl font-bold text-[var(--primary)]">Modifica impianto</h1>
      </div>
      <PlantEditClient plant={plant} compagnie={compagnie} />
    </div>
  )
}
