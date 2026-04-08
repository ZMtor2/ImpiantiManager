import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { CompagniaSchema } from "@/lib/validations/compagnia";

export async function GET() {
  try {
    await requireAuth();
    const compagnie = await prisma.compagnia.findMany({
      orderBy: { nome: "asc" },
      include: {
        _count: { select: { impianti: true } },
      },
    });
    return NextResponse.json(compagnie);
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
    const parsed = CompagniaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const compagnia = await prisma.compagnia.create({ data: parsed.data });
    return NextResponse.json(compagnia, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
