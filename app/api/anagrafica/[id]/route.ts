import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { AnagraficaSchema } from "@/lib/validations/anagrafica";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const anagrafica = await prisma.anagrafica.findUnique({
      where: { id },
      include: {
        contatti: true,
        impiantiProprietario: {
          include: { compagnia: { select: { id: true, nome: true } } },
          orderBy: { citta: "asc" },
          take: 200,
        },
        impiantiGestore: {
          include: { compagnia: { select: { id: true, nome: true } } },
          orderBy: { citta: "asc" },
          take: 200,
        },
      },
    });
    if (!anagrafica) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(anagrafica);
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
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

    const anagrafica = await prisma.$transaction(async (tx) => {
      // Delete all existing contatti and re-insert
      await tx.anagraficaContact.deleteMany({ where: { anagraficaId: id } });
      return tx.anagrafica.update({
        where: { id },
        data: {
          ...anaData,
          contatti: {
            create: contatti.map(({ id: _id, ...c }) => c),
          },
        },
        include: { contatti: true },
      });
    });

    return NextResponse.json(anagrafica);
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const proprietarioReplaceId: string | undefined = body?.proprietarioReplaceId;
    const gestoreReplaceId: string | undefined = body?.gestoreReplaceId;

    await prisma.$transaction(async (tx) => {
      await tx.plant.updateMany({
        where: { proprietarioId: id },
        data: { proprietarioId: proprietarioReplaceId ?? null },
      });
      await tx.plant.updateMany({
        where: { gestoreId: id },
        data: { gestoreId: gestoreReplaceId ?? null },
      });
      await tx.anagrafica.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
