import type { Viewpoint } from "./scene/types";

export type FurnitureChoice = { id: string; label: string; image: string; hint: string };
export type EditableFurniture = { id: string; name: string; bearing: number; pitch: number; outline: [number, number][]; choices: FurnitureChoice[] };

const asset = (name: string) => `/demo/furniture/${name}.webp`;

export const emptyPanoramas: Record<string, string> = {
  view_living: asset("living-empty"),
  view_dining: asset("dining-empty"),
  view_kitchen: asset("kitchen-empty"),
  view_primary: asset("primary-empty"),
  view_guest: asset("guest-empty"),
};

export const editableFurniture: Record<string, EditableFurniture[]> = {
  view_living: [{
    id: "sofa", name: "Living room seating", bearing: -170, pitch: -12,
    outline: [[350, 470], [405, 463], [530, 468], [568, 493], [583, 581], [565, 615], [505, 595], [449, 572], [351, 555]],
    choices: [
      { id: "original", label: "Sofa", image: "/demo/living-panorama.png", hint: "Keep the original sofa" },
      { id: "armchair", label: "Armchair", image: asset("living-armchair"), hint: "A sculptural cream chair" },
      { id: "beanbag", label: "Beanbag", image: asset("living-beanbag"), hint: "A relaxed lounge seat" },
      { id: "removed", label: "Clear space", image: asset("living-no-sofa"), hint: "Remove the sofa" },
    ],
  }],
  view_primary: [
    { id: "bed", name: "Primary bed", bearing: -90, pitch: -20, outline: [[738, 407], [998, 407], [1054, 478], [1121, 566], [1135, 643], [638, 643], [651, 566], [714, 478]], choices: [
      { id: "original", label: "Low bed", image: "/demo/primary-bedroom-panorama.png", hint: "Keep the original bed" },
      { id: "bunk", label: "Bunk bed", image: asset("primary-bunk"), hint: "Make room for two" },
      { id: "bed-removed", label: "Clear space", image: asset("primary-no-bed"), hint: "Remove the bed" },
    ] },
    { id: "bedside", name: "Bedside table", bearing: -50, pitch: -17, outline: [[1013, 476], [1096, 477], [1112, 529], [1028, 535]], choices: [
      { id: "original", label: "Bedside table", image: "/demo/primary-bedroom-panorama.png", hint: "Keep the original table" },
      { id: "desk", label: "Writing desk", image: asset("primary-desk"), hint: "Add a compact workspace" },
      { id: "bedside-removed", label: "Clear space", image: asset("primary-no-side"), hint: "Remove the table" },
    ] },
  ],
};

export function panoramaFor(viewpoint: Viewpoint, choice?: string) {
  if (!choice || choice === "original") return viewpoint.panoramaUrl;
  if (choice === "empty") return emptyPanoramas[viewpoint.id] ?? viewpoint.panoramaUrl;
  if (viewpoint.id === "view_primary") {
    const { bed, bedside } = primarySelections(choice);
    const variants: Record<string, string> = {
      "bunk|original": asset("primary-bunk"),
      "bed-removed|original": asset("primary-no-bed"),
      "original|desk": asset("primary-desk"),
      "original|bedside-removed": asset("primary-no-side"),
      "bunk|desk": asset("primary-bunk-desk"),
      "bunk|bedside-removed": asset("primary-bunk-no-side"),
      "bed-removed|desk": asset("primary-no-bed-desk"),
      "bed-removed|bedside-removed": asset("primary-no-bed-no-side"),
    };
    return variants[`${bed}|${bedside}`] ?? viewpoint.panoramaUrl;
  }
  return editableFurniture[viewpoint.id]?.flatMap((item) => item.choices)
    .find((option) => option.id === choice)?.image ?? viewpoint.panoramaUrl;
}

function primarySelections(choice: string) {
  if (choice === "empty") return { bed: "bed-removed", bedside: "bedside-removed" };
  if (choice.includes("|")) {
    const [bed, bedside] = choice.split("|");
    return { bed: bed || "original", bedside: bedside || "original" };
  }
  return { bed: ["bunk", "bed-removed"].includes(choice) ? choice : "original", bedside: ["desk", "bedside-removed"].includes(choice) ? choice : "original" };
}

export function selectedFurnitureChoice(viewpointId: string, sceneChoice: string, itemId: string) {
  if (sceneChoice === "empty") return itemId === "bed" ? "bed-removed" : itemId === "bedside" ? "bedside-removed" : "removed";
  if (viewpointId !== "view_primary") return sceneChoice || "original";
  return primarySelections(sceneChoice)[itemId as "bed" | "bedside"] ?? "original";
}

export function withFurnitureChoice(viewpointId: string, sceneChoice: string, itemId: string | undefined, optionId: string) {
  if (!itemId || optionId === "empty") return optionId;
  if (viewpointId !== "view_primary") return optionId;
  const current = primarySelections(sceneChoice);
  return itemId === "bed" ? `${optionId}|${current.bedside}` : `${current.bed}|${optionId}`;
}
