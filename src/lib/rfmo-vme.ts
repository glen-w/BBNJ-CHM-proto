import type { AbnjBox } from "@/lib/contracts/events";

export type VmeFeature = {
  layerId: string;
  rfmo: string;
  label: string;
  rings: [number, number][][];
};

export type VmeFeatureCollection = {
  features: VmeFeature[];
};

/** Demo ABNJ box → illustrative RFMO closure layers (not a gazetteer). */
export const VME_LAYER_IDS_BY_BOX: Partial<Record<AbnjBox, string[]>> = {
  "NE Atlantic Mesopelagic Belt": ["neafc", "nafo"],
  "Southern Ocean Polar Front": ["ccamlr"],
  "Central Indian Ridge": ["siofa"],
  "Tonga-Kermadec Arc": ["sprfmo"],
  "Clarion-Clipperton South": ["sprfmo"],
  CCZ: ["siofa"],
};

export function parseVmeGeoJson(raw: {
  features: Array<{
    properties: { layerId: string; rfmo: string; label: string };
    geometry: { type: string; coordinates: number[][][] };
  }>;
}): VmeFeatureCollection {
  const features: VmeFeature[] = [];
  for (const f of raw.features) {
    if (f.geometry.type !== "Polygon") continue;
    const rings = f.geometry.coordinates.map((ring) =>
      ring.map(([lon, lat]) => [lon, lat] as [number, number]),
    );
    features.push({
      layerId: f.properties.layerId,
      rfmo: f.properties.rfmo,
      label: f.properties.label,
      rings,
    });
  }
  return { features };
}

export function featuresForAbnjBox(collection: VmeFeatureCollection, box: AbnjBox): VmeFeature[] {
  const ids = VME_LAYER_IDS_BY_BOX[box];
  if (!ids?.length) return [];
  const set = new Set(ids);
  return collection.features.filter((f) => set.has(f.layerId));
}

export function boundsOfFeatures(features: VmeFeature[]): { minLon: number; maxLon: number; minLat: number; maxLat: number } | null {
  if (features.length === 0) return null;
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const f of features) {
    for (const ring of f.rings) {
      for (const [lon, lat] of ring) {
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
    }
  }
  return { minLon, maxLon, minLat, maxLat };
}

export function ringToSvgPoints(
  ring: [number, number][],
  bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number },
  width: number,
  height: number,
  pad = 8,
): string {
  const w = width - pad * 2;
  const h = height - pad * 2;
  const dLon = bounds.maxLon - bounds.minLon || 1;
  const dLat = bounds.maxLat - bounds.minLat || 1;
  return ring
    .map(([lon, lat]) => {
      const x = pad + ((lon - bounds.minLon) / dLon) * w;
      const y = pad + ((bounds.maxLat - lat) / dLat) * h;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}
