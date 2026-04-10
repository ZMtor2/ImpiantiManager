import { prisma } from "@/lib/db"
import { PlantWizard } from "@/components/impianti/plant-wizard"

export default async function NuovoImpiantoPage() {
  let compagnie: { id: string; nome: string }[] = []
  try {
    compagnie = await prisma.compagnia.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } })
  } catch { /* DB not ready */ }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--primary)]">Nuovo Impianto</h1>
        <p className="text-sm text-muted-foreground mt-1">Segui i passaggi per censire un nuovo impianto.</p>
      </div>
      <PlantWizard compagnie={compagnie} />
    </div>
  )
}
