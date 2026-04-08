import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { EquipmentSchema } from "@/lib/validations/equipment";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        pistole: true,
        terminaleBank: true,
        terminalePetrolio: true,
        schedaMacchina: { include: { rotte: true } },
        networkDevices: true,
        documenti: {
          include: {
            caricatoDa: { select: { id: true, nome: true, cognome: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(equipment);
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
    const parsed = EquipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { pistole, terminaleBank, terminalePetrolio, schedaMacchina, ...equipData } =
      parsed.data;

    const equipment = await prisma.$transaction(async (tx) => {
      // Update base equipment fields
      const eq = await tx.equipment.update({
        where: { id },
        data: equipData,
      });

      // EROGATORE: replace pistole
      if (eq.tipo === "EROGATORE") {
        await tx.equipmentProduct.deleteMany({ where: { equipmentId: id } });
        if (pistole && pistole.length > 0) {
          await tx.equipmentProduct.createMany({
            data: pistole.map(({ id: _id, ...p }) => ({
              ...p,
              equipmentId: id,
            })),
          });
        }
      }

      // COLONNINA_PAGAMENTO: upsert banking and petroleum terminals
      if (eq.tipo === "COLONNINA_PAGAMENTO") {
        if (terminaleBank !== undefined) {
          if (terminaleBank === null) {
            await tx.bankingTerminal.deleteMany({ where: { equipmentId: id } });
          } else {
            await tx.bankingTerminal.upsert({
              where: { equipmentId: id },
              create: { ...terminaleBank, equipmentId: id },
              update: terminaleBank,
            });
          }
        }
        if (terminalePetrolio !== undefined) {
          if (terminalePetrolio === null) {
            await tx.petroleumTerminal.deleteMany({ where: { equipmentId: id } });
          } else {
            await tx.petroleumTerminal.upsert({
              where: { equipmentId: id },
              create: { ...terminalePetrolio, equipmentId: id },
              update: terminalePetrolio,
            });
          }
        }
      }

      // GESTIONALE: upsert SchedaMacchina and replace rotte
      if (eq.tipo === "GESTIONALE" && schedaMacchina !== undefined) {
        if (schedaMacchina === null) {
          await tx.schedaMacchina.deleteMany({ where: { equipmentId: id } });
        } else {
          const { rotte, ...schedaData } = schedaMacchina;
          const existing = await tx.schedaMacchina.findUnique({
            where: { equipmentId: id },
          });
          if (existing) {
            await tx.gestionaleRoute.deleteMany({
              where: { schedaMacchinaId: existing.id },
            });
            await tx.schedaMacchina.update({
              where: { equipmentId: id },
              data: {
                ...schedaData,
                rotte: {
                  create: rotte.map(({ id: _id, ...r }) => r),
                },
              },
            });
          } else {
            await tx.schedaMacchina.create({
              data: {
                ...schedaData,
                equipmentId: id,
                rotte: {
                  create: rotte.map(({ id: _id, ...r }) => r),
                },
              },
            });
          }
        }
      }

      return tx.equipment.findUnique({
        where: { id },
        include: {
          pistole: true,
          terminaleBank: true,
          terminalePetrolio: true,
          schedaMacchina: { include: { rotte: true } },
        },
      });
    });

    return NextResponse.json(equipment);
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
    await prisma.equipment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
