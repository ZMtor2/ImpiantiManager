import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";

const DocumentUpdateSchema = z.object({
  descrizione: z.string().optional().nullable(),
  equipmentId: z.string().optional().nullable(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const parsed = DocumentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const documento = await prisma.document.update({
      where: { id },
      data: parsed.data,
      include: {
        caricatoDa: { select: { id: true, nome: true, cognome: true } },
      },
    });

    return NextResponse.json(documento);
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    // Fetch the document first so we have the storage URL for cleanup
    const documento = await prisma.document.findUnique({
      where: { id },
      select: { id: true, urlStorage: true },
    });

    if (!documento) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.document.delete({ where: { id } });

    // Storage file deletion is handled externally (e.g. via storage provider SDK)
    // The urlStorage is returned so the caller can delete the file if needed
    return NextResponse.json({ success: true, urlStorage: documento.urlStorage });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
