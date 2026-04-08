import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { PlantSchema } from "@/lib/validations/plant";
import { geocodeAddress } from "@/lib/geocoding";

export async function GET(req: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q") ?? "";
    const compagniaIds = searchParams.get("compagniaId")
      ? searchParams.get("compagniaId")!.split(",").filter(Boolean)
      : [];
    const stati = searchParams.get("stato")
      ? searchParams.get("stato")!.split(",").filter(Boolean)
      : [];
    const tipi = searchParams.get("tipoImpianto")
      ? searchParams.get("tipoImpianto")!.split(",").filter(Boolean)
      : [];
    const province = searchParams.get("provincia")
      ? searchParams.get("provincia")!.split(",").filter(Boolean)
      : [];
    const proprietarioId = searchParams.get("proprietarioId");
    const gestoreId = searchParams.get("gestoreId");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10));
    const skip = (page - 1) * limit;

    const andConditions: Prisma.PlantWhereInput[] = [];

    if (q) {
      andConditions.push({
        OR: [
          { indirizzo: { contains: q, mode: "insensitive" } },
          { citta: { contains: q, mode: "insensitive" } },
          { alias: { contains: q, mode: "insensitive" } },
          { codice: { contains: q, mode: "insensitive" } },
          { proprietario: { ragioneSociale: { contains: q, mode: "insensitive" } } },
          { gestore: { ragioneSociale: { contains: q, mode: "insensitive" } } },
        ],
      });
    }
    if (compagniaIds.length > 0) {
      andConditions.push({ compagniaId: { in: compagniaIds } });
    }
    if (stati.length > 0) {
      andConditions.push({ stato: { in: stati as Prisma.EnumStatoImpiantoFilter["in"] } });
    }
    if (tipi.length > 0) {
      andConditions.push({ tipoImpianto: { in: tipi as Prisma.EnumTipoImpiantoFilter["in"] } });
    }
    if (province.length > 0) {
      andConditions.push({ provincia: { in: province } });
    }
    if (proprietarioId) {
      andConditions.push({ proprietarioId });
    }
    if (gestoreId) {
      andConditions.push({ gestoreId });
    }

    const where: Prisma.PlantWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const [data, total] = await Promise.all([
      prisma.plant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          compagnia: true,
          proprietario: { select: { id: true, ragioneSociale: true } },
          gestore: { select: { id: true, ragioneSociale: true } },
        },
      }),
      prisma.plant.count({ where }),
    ]);

    // Suppress unused session warning
    void session;

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
    const session = await requireAuth();
    const body = await req.json();
    const parsed = PlantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { dataApertura, ...plantData } = parsed.data;
    const createdById = (session.user as { id: string }).id;

    // Geocode address
    let latitudine: number | undefined;
    let longitudine: number | undefined;
    const geo = await geocodeAddress(
      plantData.indirizzo,
      plantData.citta,
      plantData.provincia
    );
    if (geo) {
      latitudine = geo.lat;
      longitudine = geo.lon;
    }

    const plant = await prisma.plant.create({
      data: {
        ...plantData,
        dataApertura: dataApertura ? new Date(dataApertura) : null,
        createdById,
        latitudine,
        longitudine,
      },
      include: {
        compagnia: true,
        proprietario: { select: { id: true, ragioneSociale: true } },
        gestore: { select: { id: true, ragioneSociale: true } },
      },
    });

    return NextResponse.json(plant, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
