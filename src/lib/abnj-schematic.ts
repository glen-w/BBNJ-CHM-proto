import { AbnjBox } from "@/lib/contracts/events";

/** Schematic positions on a simple Atlantic-centred diagram — not geographic coordinates. */
export type AbnjSchematicNode = {
  box: (typeof AbnjBox.options)[number];
  x: number;
  y: number;
  label: string;
};

/** Every AbnjBox enum value must appear exactly once. */
export const ABNJ_SCHEMATIC_NODES: readonly AbnjSchematicNode[] = [
  { box: "CCZ", x: 72, y: 58, label: "CCZ" },
  { box: "Clarion-Clipperton South", x: 68, y: 68, label: "CCZ S" },
  { box: "Reykjanes Ridge", x: 48, y: 22, label: "Reykjanes" },
  { box: "Mid-Atlantic Splashdown Corridor", x: 42, y: 48, label: "Splashdown" },
  { box: "NE Atlantic Mesopelagic Belt", x: 52, y: 38, label: "Mesopelagic" },
  { box: "North Atlantic OAE Trial Box", x: 38, y: 32, label: "OAE trial" },
  { box: "Sargasso Sea Core", x: 32, y: 52, label: "Sargasso" },
  { box: "Costa Rica Thermal Dome", x: 18, y: 62, label: "CR Dome" },
];

if (ABNJ_SCHEMATIC_NODES.length !== AbnjBox.options.length) {
  throw new Error("ABNJ_SCHEMATIC_NODES must cover every AbnjBox enum value");
}

for (const box of AbnjBox.options) {
  if (!ABNJ_SCHEMATIC_NODES.some((n) => n.box === box)) {
    throw new Error(`ABNJ schematic missing box: ${box}`);
  }
}
