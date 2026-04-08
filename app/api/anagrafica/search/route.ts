import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";

    const results = await prisma.anagrafica.findMany({
      where: {
        ragioneSociale: { contains: q, mode: "insensitive" },
      },
      select: { id: true, ragioneSociale: true },
      orderBy: { ragioneSociale: "asc" },
      take: 10,
    });

    return NextResponse.json(results);
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
