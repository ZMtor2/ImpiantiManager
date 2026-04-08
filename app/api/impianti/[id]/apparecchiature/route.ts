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
    const { id: impiantoId } = await params;

    const apparecchiature = await prisma.equipment.findMany({
      where: { impiantoId },
      include: {
        pistole: true,
        terminaleBank: true,
        terminalePetrolio: true,
        schedaMacchina: { include: { rotte: true } },
      },
      orderBy: { tipo: "asc" },
    });

    return NextResponse.json(apparecchiature);
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
    await requireAuth();
    const { id: impiantoId } = await params;
    const body = await req.json();
    const parsed = EquipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { pistole, terminaleBank, terminalePetrolio, schedaMacchina, ...equipData } =
      parsed.data;

    const equipment = await prisma.$transaction(async (tx) => {
      // Create base equipment record
      const eq = await tx.equipment.create({
        data: { ...equipData, impiantoId },
      });

      // EROGATORE: create pistole (fuel nozzles)
      if (equipData.tipo === "EROGATORE" && pistole && pistole.length > 0) {
        await tx.equipmentProduct.createMany({
          data: pistole.map(({ id: _id, ...p }) => ({
            ...p,
            equipmentId: eq.id,
          })),
        });
      }

      // COLONNINA_PAGAMENTO: create banking and petroleum terminals
      if (equipData.tipo === "COLONNINA_PAGAMENTO") {
        if (terminaleBank) {
          await tx.bankingTerminal.create({
            data: { ...terminaleBank, equipmentId: eq.id },
          });
        }
        if (terminalePetrolio) {
          await tx.petroleumTerminal.create({
            data: { ...terminalePetrolio, equipmentId: eq.id },
          });
        }
      }

      // GESTIONALE: create SchedaMacchina with rotte
      if (equipData.tipo === "GESTIONALE" && schedaMacchina) {
        const { rotte, ...schedaData } = schedaMacchina;
        await tx.schedaMacchina.create({
          data: {
            ...schedaData,
            equipmentId: eq.id,
            rotte: {
              create: rotte.map(({ id: _id, ...r }) => r),
            },
          },
        });
      }

      // CENTRALINA_LIVELLO with RETE_IP: auto-create a NetworkDevice for the plant
      if (
        equipData.tipo === "CENTRALINA_LIVELLO" &&
        equipData.modalitaConnessione === "RETE_IP"
      ) {
        await tx.networkDevice.create({
          data: {
            impiantoId,
            equipmentId: eq.id,
            etichetta: `Centralina ${eq.id.slice(0, 6)}`,
            tipoDispositivo: "ALTRO",
            indirizzoIp: "0.0.0.0",
          },
        });
      }

      return tx.equipment.findUnique({
        where: { id: eq.id },
        include: {
          pistole: true,
          terminaleBank: true,
          terminalePetrolio: true,
          schedaMacchina: { include: { rotte: true } },
        },
      });
    });

    return NextResponse.json(equipment, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
