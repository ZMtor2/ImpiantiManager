"use client"

import { useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { tipoImpiantoLabel, statoImpiantoLabel } from "@/lib/labels"

interface Compagnia { id: string; nome: string }

interface PlantFiltersProps {
  compagnie: Compagnia[]
}

const STATI = ["ATTIVO", "INATTIVO", "DISMESSO"]
const TIPI = ["STRADALE", "AUTOSTRADALE", "PRIVATO", "INDUSTRIALE", "NAUTICO", "AEROPORTUALE"]

const statoColor: Record<string, string> = {
  ATTIVO: "bg-green-900/40 text-green-400 border-green-800",
  INATTIVO: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  DISMESSO: "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]",
}

export function PlantFilters({ compagnie }: PlantFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const q = searchParams.get("q") ?? ""
  const compagniaIds = searchParams.get("compagniaId")?.split(",").filter(Boolean) ?? []
  const stati = searchParams.get("stato")?.split(",").filter(Boolean) ?? []
  const tipi = searchParams.get("tipoImpianto")?.split(",").filter(Boolean) ?? []

  const hasFilters = q || compagniaIds.length > 0 || stati.length > 0 || tipi.length > 0

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete("page")
    router.push(`/impianti?${params.toString()}`)
  }, [router, searchParams])

  const toggleArray = useCallback((key: string, current: string[], value: string) => {
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
    update(key, next.join(","))
  }, [update])

  const clearAll = useCallback(() => {
    router.push("/impianti")
  }, [router])

  return (
    <div className="space-y-4 bg-[var(--card)] border border-border rounded-lg p-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per indirizzo, città, cliente, codice..."
          className="pl-9"
          defaultValue={q}
          onKeyDown={(e) => {
            if (e.key === "Enter") update("q", (e.target as HTMLInputElement).value)
          }}
          onBlur={(e) => update("q", e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-6">
        {/* Compagnie */}
        {compagnie.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Bandiera</p>
            <div className="flex flex-wrap gap-1.5">
              {compagnie.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleArray("compagniaId", compagniaIds, c.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    compagniaIds.includes(c.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:border-primary/50"
                  }`}
                >
                  {c.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stato */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Stato</p>
          <div className="flex flex-wrap gap-1.5">
            {STATI.map((s) => (
              <button
                key={s}
                onClick={() => toggleArray("stato", stati, s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  stati.includes(s) ? statoColor[s] + " !border-current" : "bg-background border-border hover:border-primary/50"
                }`}
              >
                {statoImpiantoLabel[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Tipo */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Tipo</p>
          <div className="flex flex-wrap gap-1.5">
            {TIPI.map((t) => (
              <button
                key={t}
                onClick={() => toggleArray("tipoImpianto", tipi, t)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  tipi.includes(t)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-primary/50"
                }`}
              >
                {tipoImpiantoLabel[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active filters + clear */}
      {hasFilters && (
        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <span className="text-xs text-muted-foreground">Filtri attivi:</span>
          {q && <Badge variant="secondary" className="text-xs">{`"${q}"`}</Badge>}
          {compagniaIds.map(id => {
            const c = compagnie.find(x => x.id === id)
            return c ? <Badge key={id} variant="secondary" className="text-xs">{c.nome}</Badge> : null
          })}
          {stati.map(s => <Badge key={s} variant="secondary" className="text-xs">{statoImpiantoLabel[s]}</Badge>)}
          {tipi.map(t => <Badge key={t} variant="secondary" className="text-xs">{tipoImpiantoLabel[t]}</Badge>)}
          <Button variant="ghost" size="sm" onClick={clearAll} className="ml-auto h-7 text-xs gap-1">
            <X className="h-3 w-3" /> Azzera
          </Button>
        </div>
      )}
    </div>
  )
}
