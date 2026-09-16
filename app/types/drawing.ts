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