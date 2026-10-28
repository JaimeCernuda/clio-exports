import React from "react";
import { NativeProductFilm } from "./NativeProductFilm";
import type { CampaignId } from "../native/campaign-catalog";
import type { FocusBeat } from "../native/presentation-plan";

export type NativeFocusShotProps = {
  nativeServer: string;
  campaignId: CampaignId;
  frameOffset: number;
  shotFrames: number;
  recordCursor?: boolean;
  inspectionFocus?: FocusBeat;
};

/** Render a selected native inspection without repeating the unchanged conversation. */
export function NativeFocusShot({
  shotFrames: _frames,
  ...props
}: NativeFocusShotProps) {
  return <NativeProductFilm {...props} mode="campaign" cut="pitch" />;
}
