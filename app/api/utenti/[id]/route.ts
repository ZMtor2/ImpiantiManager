import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const UserUpdateSchema = z.object({
  nome: z.string().min(1).optional(),
  cognome: z.string().min(1).optional(),
  email: z.string().email().optional(),
  ruolo: z.enum(["ADMIN", "TECNICO", "VIEWER"]).optional(),
  attivo: z.boolean().optional(),
  password: z.string().min(6).optional(), // if provided, reset passwordHash
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const utente = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        cognome: true,
        email: true,
        ruolo: true,
        attivo: true,
        ultimoAccesso: true,
        createdAt: true,
      },
    });

    if (!utente) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(utente);
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const parsed = UserUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { password, ...updateFields } = parsed.data;

    const data: Record<string, unknown> = { ...updateFields };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 12);
    }

    const utente = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        nome: true,
        cognome: true,
        email: true,
        ruolo: true,
        attivo: true,
        ultimoAccesso: true,
        createdAt: true,
      },
    });

    return NextResponse.json(utente);
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    const session = await requireAdmin();
    const { id } = await params;

    // Prevent self-deletion
    const currentUserId = (session.user as { id: string }).id;
    if (id === currentUserId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
