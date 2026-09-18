import { planBearingDegrees, planDistance } from "./coordinates";
import type { Viewpoint } from "./types";

type ViewpointSeed = Omit<Viewpoint, "neighbours"> & { neighbourIds: string[] };

const viewpointSeeds: ViewpointSeed[] = [
  {
    id: "view_living",
    index: 1,
    roomId: "room_open_living",
    name: "Living room",
    roomLabel: "Open living",
    planPosition: { x: 69, y: 29 },
    elevation: 1.6,
    panoramaUrl: "/demo/living-panorama.png",
    expectedWidth: 1774,
    expectedHeight: 887,
    initialYaw: 0,
    initialPitch: 0,
    initialFov: 72,
    neighbourIds: ["view_dining", "view_primary"],
  },
  {
    id: "view_dining",
    index: 2,
    roomId: "room_open_living",
    name: "Dining area",
    roomLabel: "Open living",
    planPosition: { x: 63, y: 51 },
    elevation: 1.6,
    panoramaUrl: "/demo/dining-panorama.png",
    expectedWidth: 1774,
    expectedHeight: 887,
    initialYaw: 0,
    initialPitch: 0,
    initialFov: 72,
    neighbourIds: ["view_living", "view_kitchen", "view_guest"],
  },
  {
    id: "view_kitchen",
    index: 3,
    roomId: "room_open_kitchen",
    name: "Kitchen",
    roomLabel: "Open kitchen",
    planPosition: { x: 78, y: 70 },
    elevation: 1.6,
    panoramaUrl: "/demo/kitchen-panorama.png",
    expectedWidth: 1774,
    expectedHeight: 887,
    initialYaw: 0,
    initialPitch: 0,
    initialFov: 72,
    neighbourIds: ["view_dining", "view_guest"],
  },
  {
    id: "view_primary",
    index: 4,
    roomId: "room_primary_bedroom",
    name: "Primary bedroom",
    roomLabel: "Bedroom 01",
    planPosition: { x: 27, y: 26 },
    elevation: 1.6,
    panoramaUrl: "/demo/primary-bedroom-panorama.png",
    expectedWidth: 1774,
    expectedHeight: 887,
    initialYaw: 0,
    initialPitch: 0,
    initialFov: 72,
    neighbourIds: ["view_living", "view_guest"],
  },
  {
    id: "view_guest",
    index: 5,
    roomId: "room_guest_bedroom",
    name: "Guest bedroom",
    roomLabel: "Bedroom 02",
    planPosition: { x: 26, y: 66 },
    elevation: 1.6,
    panoramaUrl: "/demo/guest-bedroom-panorama.png",
    expectedWidth: 1774,
    expectedHeight: 887,
    initialYaw: 0,
    initialPitch: 0,
    initialFov: 72,
    neighbourIds: ["view_dining", "view_kitchen", "view_primary"],
  },
];

const seedById = new Map(viewpointSeeds.map((viewpoint) => [viewpoint.id, viewpoint]));

export const demoViewpoints: Viewpoint[] = viewpointSeeds.map(({ neighbourIds, ...viewpoint }) => ({
  ...viewpoint,
  neighbours: neighbourIds.flatMap((viewpointId) => {
    const target = seedById.get(viewpointId);
    if (!target) return [];
    return [{
      viewpointId,
      bearing: planBearingDegrees(viewpoint.planPosition, target.planPosition),
      distance: planDistance(viewpoint.planPosition, target.planPosition),
    }];
  }),
}));

export const demoViewpointById = new Map(demoViewpoints.map((viewpoint) => [viewpoint.id, viewpoint]));
