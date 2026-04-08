export async function geocodeAddress(
  indirizzo: string,
  citta: string,
  provincia: string
): Promise<{ lat: number; lon: number } | null> {
  const query = encodeURIComponent(`${indirizzo}, ${citta}, ${provincia}, Italy`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ImpiantiManager/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch {
    // Geocoding failed — non-critical
  }
  return null;
}
