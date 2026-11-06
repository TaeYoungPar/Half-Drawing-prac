"use client";

import { useMyRooms } from "../hooks/useMyRooms";
import { MyDrawings } from "./MyDrawings";
import type { publicBannerConfig } from "../lib/ads";

export function DrawingLibrary({ adConfig }: { adConfig?: ReturnType<typeof publicBannerConfig> }) {
  const state = useMyRooms();
  return <MyDrawings state={state} adConfig={adConfig} />;
}
