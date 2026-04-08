import { ClienteForm } from "@/components/clienti/cliente-form"

export default function NuovoClientePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-[#0f4c75]">Nuovo Cliente</h1>
      <ClienteForm />
    </div>
  )
}
