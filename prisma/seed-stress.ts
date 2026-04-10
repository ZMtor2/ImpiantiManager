/**
 * Stress seed — genera migliaia di record per testare performance e bug.
 * Uso: npm run db:seed:stress
 *
 * Genera:
 *   - 10 compagnie
 *   - 500 anagrafiche (clienti) con 1-3 contatti ciascuna
 *   - 5.000 impianti distribuiti tra le compagnie e i clienti
 *   - 2-4 apparecchiature per impianto (10.000-20.000 record)
 *   - 1-3 network device per impianto (~10.000 record)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Helpers ──────────────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number) {
  return +(Math.random() * (max - min) + min).toFixed(6);
}
function maybe<T>(value: T, prob = 0.5): T | null {
  return Math.random() < prob ? value : null;
}

// ── Dati geografici italiani ──────────────────────────────────────────────────
const PROVINCE = ["MI","RM","NA","TO","PA","GE","BO","FI","BA","CT","VE","VR","ME","PD","TS","TN","BZ","RC","CL","AG","CA","SS","NU","OR","TR","PG","AN","MC","PS","AP","FM","CH","AQ","PE","CB","IS","BN","AV","SA","CS","CZ","KR","VV","PZ","MT","FG","BR","LE","TA","EN","RG","SR","TP"]
const CITTA: Record<string, string[]> = {
  MI: ["Milano","Sesto San Giovanni","Monza","Cinisello Balsamo","Legnano"],
  RM: ["Roma","Guidonia","Fiumicino","Tivoli","Pomezia"],
  NA: ["Napoli","Giugliano","Torre del Greco","Casoria","Pozzuoli"],
  TO: ["Torino","Moncalieri","Collegno","Nichelino","Rivoli"],
  PA: ["Palermo","Bagheria","Monreale","Carini","Partinico"],
  GE: ["Genova","Rapallo","La Spezia","Savona","Sanremo"],
  BO: ["Bologna","Imola","Modena","Ferrara","Reggio Emilia"],
  FI: ["Firenze","Prato","Empoli","Pistoia","Livorno"],
  BA: ["Bari","Taranto","Andria","Altamura","Barletta"],
  CT: ["Catania","Acireale","Paternò","Caltagirone","Misterbianco"],
}

function getCitta(prov: string): string {
  const list = CITTA[prov] ?? ["Comune di " + prov]
  return pick(list)
}

const STRADE = ["Via Roma","Via Garibaldi","Corso Italia","Via Manzoni","Via Dante","Via Verdi","Via Cavour","Viale Europa","Via Milano","Corso Umberto","Via Nazionale","Via Amendola","Via Kennedy","Via De Gasperi","Via Matteotti","Strada Statale","Via dell'Industria","Via Artigiani"]
const TIPI_IMPIANTO = ["STRADALE","STRADALE","STRADALE","AUTOSTRADALE","PRIVATO","INDUSTRIALE","NAUTICO"]
const STATI = ["ATTIVO","ATTIVO","ATTIVO","ATTIVO","INATTIVO","DISMESSO"]
const TIPI_CARBURANTE = ["BENZINA","DIESEL","GPL","METANO","ADBLUE"]
const TIPI_EROGATORE = ["MONOPRODOTTO","MULTIPRODOTTO","SELF_SERVICE","AUTOMATICO"]
const TIPI_DISPOSITIVO = ["PC","ROUTER","SWITCH","POS","COLONNINA"]
const MARCHE = ["Wayne","Gilbarco","Tokheim","Tatsuno","LiquidPower","Dresser","Bennett","Moormaster"]
const MARCHE_NET = ["Cisco","HPE","Ubiquiti","Netgear","TP-Link","Mikrotik","Fortinet"]

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const N_COMPAGNIE = 10
  const N_CLIENTI   = 500
  const N_IMPIANTI  = 5_000
  const BATCH       = 100  // inserimento a batch per non saturare la connessione

  console.log("🌱 Stress seed avviato...")
  console.time("total")

  // ── Admin user ───────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("admin123", 12)
  const admin = await prisma.user.upsert({
    where: { email: "admin@impiantimanager.it" },
    update: {},
    create: { nome: "Admin", cognome: "Sistema", email: "admin@impiantimanager.it", passwordHash, ruolo: "ADMIN", attivo: true },
  })
  console.log("✓ Admin:", admin.email)

  // ── Compagnie ────────────────────────────────────────────────────────────
  const nomiCompagnie = ["Eni/IP","Esso","Q8","Shell","TotalEnergies","Ego","Api","Tamoil","Auchan Carburants","Decathlon Energy"]
  const compagnie = []
  for (const nome of nomiCompagnie.slice(0, N_COMPAGNIE)) {
    const c = await prisma.compagnia.upsert({ where: { nome }, update: {}, create: { nome } })
    compagnie.push(c)
  }
  console.log(`✓ Compagnie: ${compagnie.length}`)

  // ── Anagrafiche (clienti) ────────────────────────────────────────────────
  console.log(`Creo ${N_CLIENTI} clienti...`)
  const clientiIds: string[] = []
  const SUFFISSI = ["Srl","Spa","Snc","Sas","Srls","di","&","Group","Holding","Impianti"]
  const NOMI = ["Rossi","Ferrari","Russo","Bianchi","Esposito","Romano","Colombo","Ricci","Marino","Greco","Bruno","Gallo","Conti","De Luca","Mancini","Costa","Giordano","Rizzo","Lombardi","Moretti"]

  for (let i = 0; i < N_CLIENTI; i += BATCH) {
    const batch = Math.min(BATCH, N_CLIENTI - i)
    const creates = []
    for (let j = 0; j < batch; j++) {
      const n = i + j
      const prov = pick(PROVINCE)
      creates.push(prisma.anagrafica.create({
        data: {
          ragioneSociale: `${pick(NOMI)} ${pick(SUFFISSI)} ${n + 1}`,
          partitaIva: maybe(`0${String(rand(1000000000, 9999999999)).slice(0,10)}`, 0.8),
          codiceFiscale: maybe(`${String.fromCharCode(65 + rand(0,25))}${String.fromCharCode(65 + rand(0,25))}${String.fromCharCode(65 + rand(0,25))}${String.fromCharCode(65 + rand(0,25))}${String.fromCharCode(65 + rand(0,25))}${String.fromCharCode(65 + rand(0,25))}${rand(10,99)}${String.fromCharCode(65 + rand(0,25))}${rand(10,99)}${String.fromCharCode(65 + rand(0,25))}${rand(100,999)}${String.fromCharCode(65 + rand(0,25))}`, 0.6),
          indirizzo: `${pick(STRADE)} ${rand(1,200)}`,
          citta: getCitta(prov),
          provincia: prov,
          cap: `${rand(10000, 99999)}`,
          contatti: {
            create: Array.from({ length: rand(1, 3) }, (_, ci) => ({
              nome: `${pick(NOMI)} Contatto${ci + 1}`,
              ruolo: pick(["Titolare","Amministratore","Referente tecnico","Responsabile","Segreteria",null]),
              telefono: maybe(`3${rand(10,99)}${rand(1000000,9999999)}`),
              email: maybe(`contatto${n}_${ci}@example.com`),
            })),
          },
        },
        select: { id: true },
      }))
    }
    const results = await Promise.all(creates)
    clientiIds.push(...results.map(r => r.id))
    process.stdout.write(`\r  clienti: ${Math.min(i + BATCH, N_CLIENTI)}/${N_CLIENTI}`)
  }
  console.log(`\n✓ Clienti: ${clientiIds.length}`)

  // ── Impianti ─────────────────────────────────────────────────────────────
  console.log(`Creo ${N_IMPIANTI} impianti con apparecchiature e dispositivi di rete...`)
  let impiantiCreati = 0

  for (let i = 0; i < N_IMPIANTI; i += BATCH) {
    const batch = Math.min(BATCH, N_IMPIANTI - i)
    const creates = []

    for (let j = 0; j < batch; j++) {
      const n = i + j
      const prov = pick(PROVINCE)
      const citta = getCitta(prov)
      const compagnia = pick(compagnie)
      const hasProprietario = Math.random() < 0.7
      const hasGestore = Math.random() < 0.6
      const proprietarioId = hasProprietario ? pick(clientiIds) : null
      const gestoreId = hasGestore ? pick(clientiIds) : null
      const nErogatori = rand(1, 4)
      const nSerbatoi  = rand(1, 3)

      creates.push(prisma.plant.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: {
          codice: maybe(`IMP${String(n + 1).padStart(5, "0")}`, 0.9),
          alias: maybe(`${pick(NOMI)} ${pick(["corner","angolo","centro","stazione"])}`, 0.3),
          indirizzo: `${pick(STRADE)} ${rand(1, 500)}`,
          citta,
          provincia: prov,
          cap: `${rand(10000, 99999)}`,
          latitudine: randFloat(36.5, 47.1),
          longitudine: randFloat(6.6, 18.5),
          compagniaId: compagnia.id,
          codiceImpiantoCompagnia: maybe(`${compagnia.nome.slice(0,3).toUpperCase()}${rand(10000,99999)}`, 0.7),
          ispettoreZona: maybe(`${pick(NOMI)} Ispettore`, 0.4),
          proprietarioId,
          gestoreId,
          clienteManutenzione: proprietarioId && gestoreId ? pick(["PROPRIETARIO","GESTORE"]) : proprietarioId ? "PROPRIETARIO" : gestoreId ? "GESTORE" : null,
          tipoImpianto: pick(TIPI_IMPIANTO) as any,
          stato: pick(STATI) as any,
          numeroAutorizzazione: maybe(`AUTH-${rand(100000,999999)}`, 0.5),
          dataApertura: maybe(new Date(rand(1990, 2023), rand(0,11), rand(1,28)), 0.6),
          createdById: admin.id,
          apparecchiature: {
            create: [
              // Erogatori
              ...Array.from({ length: nErogatori }, (_, ei) => ({
                tipo: "EROGATORE" as const,
                tipoErogatore: pick(TIPI_EROGATORE),
                marca: pick(MARCHE),
                modello: `Mod-${rand(100,999)}`,
                matricola: `MAT${rand(100000,999999)}`,
                annoInstallazione: rand(2000, 2023),
                stato: pick(["FUNZIONANTE","FUNZIONANTE","FUNZIONANTE","GUASTO","IN_MANUTENZIONE"]) as "FUNZIONANTE"|"GUASTO"|"IN_MANUTENZIONE"|"DISMESSO",
                posizione: `Isola ${ei + 1}`,
                pistole: {
                  create: [
                    { lato: "A", numeroPistola: 1, tipoCarburante: pick(TIPI_CARBURANTE) },
                    { lato: "A", numeroPistola: 2, tipoCarburante: pick(TIPI_CARBURANTE) },
                    { lato: "B", numeroPistola: 1, tipoCarburante: pick(TIPI_CARBURANTE) },
                    { lato: "B", numeroPistola: 2, tipoCarburante: pick(TIPI_CARBURANTE) },
                  ],
                },
              })),
              // Serbatoi
              ...Array.from({ length: nSerbatoi }, (_, si) => ({
                tipo: "SERBATOIO" as const,
                marca: pick(["Plastitank","Citec","Dalgakiran","Alpertank"]),
                modello: `T-${rand(1000,9999)}L`,
                matricola: `SRB${rand(100000,999999)}`,
                annoInstallazione: rand(1995, 2020),
                stato: "FUNZIONANTE" as const,
                tipoCarburante: pick(TIPI_CARBURANTE),
                capacitaLitri: pick([5000,10000,20000,30000,50000]),
                posizione: `Interrato ${si + 1}`,
              })),
              // Colonnina pagamento (50% degli impianti)
              ...(Math.random() < 0.5 ? [{
                tipo: "COLONNINA_PAGAMENTO" as const,
                marca: pick(["Ingenico","Verifone","PAX","Worldline"]),
                modello: `POS-${rand(100,999)}`,
                matricola: `COL${rand(100000,999999)}`,
                stato: "FUNZIONANTE" as const,
                terminaleBank: {
                  create: {
                    codiceTerminale: `TID${rand(10000000,99999999)}`,
                    bancaCircuito: pick(["Visa","Mastercard","Bancolombia","BancaEtica","UniCredit"]),
                    indirizzoIp: `192.168.${rand(1,10)}.${rand(10,250)}`,
                    porta: pick([443,8443,8080]),
                  },
                },
              }] : []),
              // Gestionale (30% degli impianti)
              ...(Math.random() < 0.3 ? [{
                tipo: "GESTIONALE" as const,
                marca: pick(["Pumapro","Logitec","Nuvola","Proservice"]),
                modello: `GES-${rand(100,999)}`,
                matricola: `GES${rand(100000,999999)}`,
                stato: "FUNZIONANTE" as const,
                modalitaConnessione: "RETE_IP" as const,
                schedaMacchina: {
                  create: {
                    indirizzoIpPc: `192.168.${rand(1,10)}.${rand(1,50)}`,
                    usernameSistema: "admin",
                    tipoAccessoRemoto: pick(["TeamViewer","AnyDesk","RDP","VNC"]),
                    portaAccessoRemoto: pick([3389,5900,5800,8080]),
                    subnetMask: "255.255.255.0",
                    gateway: `192.168.${rand(1,10)}.1`,
                    versioneSoftware: `${rand(3,9)}.${rand(0,9)}.${rand(0,9)}`,
                  },
                },
              }] : []),
            ],
          },
          networkDevices: {
            create: Array.from({ length: rand(1, 4) }, (_, di) => ({
              etichetta: `${pick(["Router","Switch","PC-Cassa","NVR","POS","Router-4G"])} ${di + 1}`,
              tipoDispositivo: pick(TIPI_DISPOSITIVO),
              indirizzoIp: `192.168.${rand(1,10)}.${rand(1,250)}`,
              macAddress: maybe(Array.from({length:6},()=>rand(0,255).toString(16).padStart(2,"0")).join(":").toUpperCase()),
              subnetMask: "255.255.255.0",
              gateway: `192.168.${rand(1,10)}.1`,
            })),
          },
        } as any,
        select: { id: true },
      }))
    }

    await Promise.all(creates)
    impiantiCreati += batch
    process.stdout.write(`\r  impianti: ${impiantiCreati}/${N_IMPIANTI}`)
  }

  console.log(`\n✓ Impianti: ${impiantiCreati}`)
  console.timeEnd("total")

  // ── Statistiche finali ───────────────────────────────────────────────────
  const [plants, equipments, devices, anagrafiche] = await Promise.all([
    prisma.plant.count(),
    prisma.equipment.count(),
    prisma.networkDevice.count(),
    prisma.anagrafica.count(),
  ])
  console.log("\n📊 Riepilogo database:")
  console.log(`  Impianti:        ${plants.toLocaleString("it")}`)
  console.log(`  Apparecchiature: ${equipments.toLocaleString("it")}`)
  console.log(`  Dispositivi rete:${devices.toLocaleString("it")}`)
  console.log(`  Clienti:         ${anagrafiche.toLocaleString("it")}`)
  console.log(`  Compagnie:       ${compagnie.length}`)
  console.log("\n✅ Stress seed completato!")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
