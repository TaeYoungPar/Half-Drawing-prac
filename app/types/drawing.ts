export type Point = {
  x: number;
  y: number;
};

export type DrawingTool =
  "pen" | "eraser";

export type Stroke = {
  points: Point[];
  color: string;
  lineWidth: number;
  tool: DrawingTool;
};

export type DrawingSide =
  "left" | "right";

export type DrawingStatus =
  | "waiting"
  | "guest_joined"
  | "completed"
  | "expired";