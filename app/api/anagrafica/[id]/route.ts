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
          include: { compagnia: true },
          orderBy: { citta: "asc" },
        },
        impiantiGestore: {
          include: { compagnia: true },
          orderBy: { citta: "asc" },
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
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
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
