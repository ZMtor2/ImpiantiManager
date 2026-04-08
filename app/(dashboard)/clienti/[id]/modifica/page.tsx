import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { ClienteForm } from "@/components/clienti/cliente-form"

export default async function ModificaClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cliente: any = null
  try {
    cliente = await prisma.anagrafica.findUnique({ where: { id }, include: { contatti: true } })
  } catch { /* DB not ready */ }
  if (!cliente) notFound()
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-[#0f4c75]">Modifica Cliente</h1>
      <ClienteForm initialData={{
        id: cliente.id,
        ragioneSociale: cliente.ragioneSociale,
        partitaIva: cliente.partitaIva,
        codiceFiscale: cliente.codiceFiscale,
        indirizzo: cliente.indirizzo,
        citta: cliente.citta,
        provincia: cliente.provincia,
        cap: cliente.cap,
        note: cliente.note,
        contatti: (cliente.contatti ?? []).map((c: { id: string; nome: string; ruolo: string | null; telefono: string | null; email: string | null; note: string | null }) => ({
          id: c.id, nome: c.nome, ruolo: c.ruolo ?? "", telefono: c.telefono ?? "", email: c.email ?? "", note: c.note ?? "",
        }))
      }} />
    </div>
  )
}
