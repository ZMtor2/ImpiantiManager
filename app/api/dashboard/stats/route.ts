import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";

export async function GET() {
  try {
    await requireAuth();

    const [compagnieRaw, statiRaw, tipiRaw, recenti] = await Promise.all([
      // Count of plants per compagnia
      prisma.compagnia.findMany({
        select: {
          id: true,
          nome: true,
          logoUrl: true,
          _count: { select: { impianti: true } },
        },
        orderBy: { nome: "asc" },
      }),

      // Count of plants grouped by stato
      prisma.plant.groupBy({
        by: ["stato"],
        _count: { stato: true },
      }),

      // Count of plants grouped by tipoImpianto
      prisma.plant.groupBy({
        by: ["tipoImpianto"],
        _count: { tipoImpianto: true },
      }),

      // Last 10 recently modified plants
      prisma.plant.findMany({
        take: 10,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          codice: true,
          alias: true,
          indirizzo: true,
          citta: true,
          provincia: true,
          stato: true,
          updatedAt: true,
          compagnia: {
            select: { id: true, nome: true, logoUrl: true },
          },
          createdBy: {
            select: { id: true, nome: true, cognome: true },
          },
        },
      }),
    ]);

    // Reshape compagnie stats
    const compagnie = compagnieRaw.map((c) => ({
      compagniaId: c.id,
      nome: c.nome,
      logoUrl: c.logoUrl,
      count: c._count.impianti,
    }));

    // Reshape stato counts into a flat object
    const stato: Record<string, number> = {
      ATTIVO: 0,
      INATTIVO: 0,
      DISMESSO: 0,
    };
    for (const row of statiRaw) {
      stato[row.stato] = row._count.stato;
    }

    // Reshape tipo counts into a flat object
    const tipo: Record<string, number> = {};
    for (const row of tipiRaw) {
      tipo[row.tipoImpianto] = row._count.tipoImpianto;
    }

    // Reshape recenti — use createdBy as the updatedBy approximation
    const recentiShaped = recenti.map((p) => ({
      ...p,
      updatedBy: p.createdBy,
    }));

    return NextResponse.json({ compagnie, stato, tipo, recenti: recentiShaped });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
