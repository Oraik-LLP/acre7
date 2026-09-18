export type MaterialSelections = {
  walls: string;
  flooring: string;
  style: string;
  lighting: string;
};

export type RoomExtraction = {
  id: string;
  label: string;
  confidence: number;
  dimensions: { width?: number; length?: number; unit?: string };
  adjacentRoomIds: string[];
};

export type FloorPlanAnalysis = {
  projectSummary: string;
  scale: { value: number | null; unit: string | null; confidence: number };
  rooms: RoomExtraction[];
  openings: Array<{
    id: string;
    type: "door" | "window" | "opening";
    connects: string[];
    confidence: number;
  }>;
  uncertainties: string[];
  generationWarnings: string[];
};

export type ProviderStatus = {
  gemini: boolean;
  xai: boolean;
  geminiModel: string;
  xaiImageModel: string;
};
