export type PlanPoint = {
  x: number;
  y: number;
};

export type ViewpointNeighbour = {
  viewpointId: string;
  bearing: number;
  distance: number;
};

export type PanoramaValidation = {
  ratio: boolean;
  dimensions: boolean;
  format: boolean;
  seam: "not-checked";
};

export type PanoramaMetadata = {
  width: number;
  height: number;
  format: "equirectangular";
  coverage: {
    horizontal: 360;
    vertical: 180;
  };
  validation: PanoramaValidation;
};

export type Viewpoint = {
  id: string;
  index: number;
  roomId: string;
  name: string;
  roomLabel: string;
  planPosition: PlanPoint;
  elevation: number;
  panoramaUrl: string;
  expectedWidth?: number;
  expectedHeight?: number;
  initialYaw: number;
  initialPitch: number;
  initialFov: number;
  neighbours: ViewpointNeighbour[];
  depthUrl?: string;
};

export type AcreRoom = {
  id: string;
  name: string;
  polygon: Array<[number, number]>;
  floorMaterial?: string;
};

export type AcreWall = {
  id: string;
  start: [number, number];
  end: [number, number];
  height: number;
  thickness: number;
};

export type AcreOpening = {
  id: string;
  wallId: string;
  type: "door" | "window" | "opening";
  offset: number;
  width: number;
  height: number;
};

export type AcreScene = {
  units: "m";
  rooms: AcreRoom[];
  walls: AcreWall[];
  openings: AcreOpening[];
  materials: Array<{ id: string; name: string; value: string }>;
  furniture: Array<{ id: string; roomId: string; position: [number, number]; rotation: number }>;
  viewpoints: Viewpoint[];
};
