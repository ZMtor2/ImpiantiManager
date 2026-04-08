import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { PlantSchema } from "@/lib/validations/plant";
import { geocodeAddress } from "@/lib/geocoding";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const plant = await prisma.plant.findUnique({
      where: { id },
      include: {
        compagnia: true,
        proprietario: { include: { contatti: true } },
        gestore: { include: { contatti: true } },
        apparecchiature: {
          include: {
            pistole: true,
            terminaleBank: true,
            terminalePetrolio: true,
            schedaMacchina: { include: { rotte: true } },
          },
          orderBy: { tipo: "asc" },
        },
        networkDevices: { orderBy: { etichetta: "asc" } },
        documenti: {
          include: { caricatoDa: { select: { id: true, nome: true, cognome: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!plant) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(plant);
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
    const parsed = PlantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { dataApertura, ...plantData } = parsed.data;

    // Check if address-related fields changed to decide re-geocoding
    const existing = await prisma.plant.findUnique({
      where: { id },
      select: { indirizzo: true, citta: true, provincia: true },
    });

    let latitudine: number | null | undefined = undefined;
    let longitudine: number | null | undefined = undefined;

    if (
      existing &&
      (existing.indirizzo !== plantData.indirizzo ||
        existing.citta !== plantData.citta ||
        existing.provincia !== plantData.provincia)
    ) {
      const geo = await geocodeAddress(
        plantData.indirizzo,
        plantData.citta,
        plantData.provincia
      );
      latitudine = geo?.lat ?? null;
      longitudine = geo?.lon ?? null;
    }

    const updateData: Record<string, unknown> = {
      ...plantData,
      dataApertura: dataApertura ? new Date(dataApertura) : null,
    };
    if (latitudine !== undefined) updateData.latitudine = latitudine;
    if (longitudine !== undefined) updateData.longitudine = longitudine;

    const plant = await prisma.plant.update({
      where: { id },
      data: updateData,
      include: {
        compagnia: true,
        proprietario: { select: { id: true, ragioneSociale: true } },
        gestore: { select: { id: true, ragioneSociale: true } },
      },
    });

    return NextResponse.json(plant);
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
    await prisma.plant.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
