"use client";

import { useMyRooms } from "../hooks/useMyRooms";
import { MyDrawings } from "./MyDrawings";

export function DrawingLibrary() {
  const state = useMyRooms();
  return <MyDrawings state={state} />;
}
