import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const UserCreateSchema = z.object({
  nome: z.string().min(1, "Nome richiesto"),
  cognome: z.string().default(""),
  email: z.string().email("Email non valida"),
  ruolo: z.enum(["ADMIN", "TECNICO", "VIEWER"]).default("TECNICO"),
  password: z.string().min(6, "Password minima 6 caratteri"),
});

export async function GET() {
  try {
    await requireAdmin();

    const utenti = await prisma.user.findMany({
      orderBy: [{ cognome: "asc" }, { nome: "asc" }],
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

    return NextResponse.json(utenti);
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

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = UserCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { password, ...userData } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 12);

    const utente = await prisma.user.create({
      data: { ...userData, passwordHash },
      select: {
        id: true,
        nome: true,
        cognome: true,
        email: true,
        ruolo: true,
        attivo: true,
        createdAt: true,
      },
    });

    return NextResponse.json(utente, { status: 201 });
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
