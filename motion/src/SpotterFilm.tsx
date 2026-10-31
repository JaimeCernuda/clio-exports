import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { SpotterIntro } from "./SpotterIntro";
import { NativeProductFilm } from "./NativeProductFilm";
import { introEase } from "./spotter-intro-plan";
import pairData from "../native/public/opal-chainB-7795459.native.json";
import { filmPair, buildSpotterFilmPlan } from "../native/spotter-film-plan";
import type { PairedReplay } from "../native/paired-replay";
import copy from "../story/spotter-intro.json";

export const spotterFilmPlan = buildSpotterFilmPlan(
  filmPair(pairData as unknown as PairedReplay),
);
export const spotterFilmFrames = 450 + spotterFilmPlan.frames + 240;

/** The full source-ordered campaign: setup, parallel review, alert, user inspection and finding. */
export function SpotterFilm() {
  const frame = useCurrentFrame();
  const ending = 450 + spotterFilmPlan.frames;
  return (
    <AbsoluteFill style={{ background: "#f5f5f1" }}>
      <Sequence durationInFrames={480}>
        <SpotterIntro />
      </Sequence>
      <Sequence from={450} durationInFrames={spotterFilmPlan.frames}>
        <AbsoluteFill style={{ opacity: introEase(frame, 450, 480) }}>
          <NativeProductFilm
            nativeServer="http://127.0.0.1:3359"
            mode="spotter"
            pairFile="opal-chainB-7795459.native.json"
            attentionFile="chainB-7795459-attention.json"
            spotterFilm
          />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={ending - 24} durationInFrames={264}>
        <AbsoluteFill
          style={{
            background: "#f5f5f1",
            opacity: introEase(frame, ending - 24, ending),
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
          }}
        >
          <Img
            src={staticFile(copy.assets.spotter)}
            style={{ width: 650, height: 355, objectFit: "contain" }}
          />
          <div
            style={{
              fontFamily: "Inter Variable, sans-serif",
              color: "#527282",
              fontSize: 25,
              letterSpacing: ".05em",
            }}
          >
            Track · Detect · Trace
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
}
