import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { AnagraficaSchema } from "@/lib/validations/anagrafica";

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10));
    const skip = (page - 1) * limit;

    const where = q
      ? { ragioneSociale: { contains: q, mode: "insensitive" as const } }
      : undefined;

    const [items, total] = await Promise.all([
      prisma.anagrafica.findMany({
        where,
        skip,
        take: limit,
        orderBy: { ragioneSociale: "asc" },
        include: {
          contatti: true,
          _count: {
            select: {
              impiantiProprietario: true,
              impiantiGestore: true,
            },
          },
        },
      }),
      prisma.anagrafica.count({ where }),
    ]);

    // Compute deduplicated impianti count per anagrafica
    const data = items.map((a) => {
      const countProp = a._count.impiantiProprietario;
      const countGest = a._count.impiantiGestore;
      // For a deduplicated count we'd need IDs — approximate: sum minus overlap
      // Overlap requires a separate query; for list view expose both counts
      return {
        ...a,
        impiantiProprietarioCount: countProp,
        impiantiGestoreCount: countGest,
      };
    });

    return NextResponse.json({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const parsed = AnagraficaSchema.safeParse(body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const firstField = Object.entries(flat.fieldErrors)[0];
      const msg = firstField
        ? `${firstField[0]}: ${firstField[1]?.[0]}`
        : flat.formErrors[0] ?? "Dati non validi";
      console.error("Validation error:", flat);
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { contatti, ...anaData } = parsed.data;
    const anagrafica = await prisma.anagrafica.create({
      data: {
        ...anaData,
        contatti: {
          create: contatti.map(({ id: _id, ...c }) => c),
        },
      },
      include: { contatti: true },
    });
    return NextResponse.json(anagrafica, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Prisma unique constraint violation
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Partita IVA già registrata nel sistema" },
        { status: 409 }
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
