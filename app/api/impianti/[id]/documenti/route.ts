import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";

const DocumentCreateSchema = z.object({
  tipo: z.enum(["FOTO", "CERTIFICATO", "MANUALE", "COLLAUDO", "PERMESSO", "ALTRO"]),
  nomeFile: z.string().min(1, "Nome file richiesto"),
  urlStorage: z.string().min(1, "URL storage richiesto"),
  dimensioneKb: z.number().int().nonnegative(),
  descrizione: z.string().optional().nullable(),
  equipmentId: z.string().optional().nullable(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id: impiantoId } = await params;
    const { searchParams } = new URL(req.url);
    const equipmentId = searchParams.get("equipmentId");

    const documenti = await prisma.document.findMany({
      where: {
        impiantoId,
        ...(equipmentId ? { equipmentId } : {}),
      },
      include: {
        caricatoDa: { select: { id: true, nome: true, cognome: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documenti);
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: impiantoId } = await params;
    const body = await req.json();
    const parsed = DocumentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const caricatoDaId = (session.user as { id: string }).id;

    const documento = await prisma.document.create({
      data: {
        ...parsed.data,
        impiantoId,
        caricatoDaId,
      },
      include: {
        caricatoDa: { select: { id: true, nome: true, cognome: true } },
      },
    });

    return NextResponse.json(documento, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
