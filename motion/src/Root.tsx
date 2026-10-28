import React from "react";
import { NativeFocusShot } from "./NativeFocusShot";
import { CursorComposite } from "./CursorComposite";
import { Composition } from "remotion";
import { ClioProof } from "./Film";
import { FPS, FRAMES } from "./motion";
import { ComponentGallery } from "./ComponentGallery";
import { NativeProductFilm } from "./NativeProductFilm";
import { FILM_FRAMES } from "../native/film-plan";
import campaign from "../native/campaign-story.json";
import { campaigns } from "../native/campaign-catalog";
import { ConnectedStory, StoryCard, connectedPlan } from "./ConnectedStory";

/** Named composition root so Studio can locate and persist editable default props. */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="NdpCursorComposite"
      component={CursorComposite}
      width={1920}
      height={1080}
      fps={60}
      durationInFrames={480}
      defaultProps={{
        video: "http://127.0.0.1:3357/inspection-media/base.mp4",
        frames: 480,
        track: [],
      }}
      calculateMetadata={({ props }) => ({ durationInFrames: props.frames })}
    />
    <Composition
      id="NdpNativeInspection"
      component={NativeFocusShot}
      width={1920}
      height={1080}
      fps={60}
      durationInFrames={480}
      defaultProps={{
        nativeServer: "http://127.0.0.1:3357",
        campaignId: "tahoe",
        frameOffset: 0,
        shotFrames: 480,
      }}
      calculateMetadata={({ props }) => ({
        durationInFrames: props.shotFrames,
      })}
    />
    <Composition
      id="NdpClioConnectedStory"
      component={ConnectedStory}
      width={1920}
      height={1080}
      fps={60}
      durationInFrames={connectedPlan.frames}
      defaultProps={{ mediaServer: "http://127.0.0.1:3357", frameOffset: 0 }}
    />
    <Composition
      id="NdpClioConnectedProof"
      component={ConnectedStory}
      width={1920}
      height={1080}
      fps={60}
      durationInFrames={900}
      defaultProps={{
        mediaServer: "http://127.0.0.1:3357",
        frameOffset: connectedPlan.segments[2].start - 240,
      }}
    />
    <Composition
      id="NdpStoryIntro"
      component={StoryCard}
      width={1920}
      height={1080}
      fps={60}
      durationInFrames={300}
      defaultProps={{ cardId: "intro" }}
    />
    <Composition
      id="NdpStoryAltaBridge"
      component={StoryCard}
      width={1920}
      height={1080}
      fps={60}
      durationInFrames={300}
      defaultProps={{ cardId: "alta-bridge" }}
    />
    <Composition
      id="NdpStoryKonzaBridge"
      component={StoryCard}
      width={1920}
      height={1080}
      fps={60}
      durationInFrames={300}
      defaultProps={{ cardId: "konza-bridge" }}
    />
    <Composition
      id="NdpStoryOutro"
      component={StoryCard}
      width={1920}
      height={1080}
      fps={60}
      durationInFrames={300}
      defaultProps={{ cardId: "outro" }}
    />
    {(["alta", "konza"] as const).flatMap((id) => [
      <Composition
        key={id}
        id={id === "alta" ? "NdpClioAlta" : "NdpClioKonza"}
        component={NativeProductFilm}
        width={1920}
        height={1080}
        fps={60}
        durationInFrames={campaigns[id].pitch.frames}
        defaultProps={{
          nativeServer: "http://127.0.0.1:3357",
          mode: "campaign",
          cut: "pitch",
          campaignId: id,
        }}
      />,
      <Composition
        key={`${id}-proof`}
        id={id === "alta" ? "NdpClioAltaProof" : "NdpClioKonzaProof"}
        component={NativeProductFilm}
        width={1920}
        height={1080}
        fps={60}
        durationInFrames={900}
        defaultProps={{
          nativeServer: "http://127.0.0.1:3357",
          mode: "campaign",
          cut: "pitch",
          campaignId: id,
          frameOffset: id === "alta" ? 1800 : 1500,
        }}
      />,
    ])}
    <Composition
      id="NdpClioTransitionProof"
      component={NativeProductFilm}
      width={1920}
      height={1080}
      fps={60}
      durationInFrames={540}
      defaultProps={{
        nativeServer: "http://127.0.0.1:3357",
        mode: "campaign",
        cut: "pitch",
        frameOffset: 1780,
      }}
    />
    <Composition
      id="NdpClioKonzaInspectionProof"
      component={NativeProductFilm}
      width={1920}
      height={1080}
      fps={60}
      durationInFrames={720}
      defaultProps={{
        nativeServer: "http://127.0.0.1:3357",
        mode: "campaign",
        cut: "pitch",
        campaignId: "konza",
        frameOffset: 4782,
      }}
    />
    <Composition
      id="NdpClioFlowProof"
      component={NativeProductFilm}
      width={1920}
      height={1080}
      fps={60}
      durationInFrames={1080}
      defaultProps={{
        nativeServer: "http://127.0.0.1:3357",
        mode: "campaign",
        cut: "pitch",
        frameOffset: 2740,
      }}
    />
    <Composition
      id="NdpClioPitch"
      component={NativeProductFilm}
      width={1920}
      height={1080}
      fps={60}
      durationInFrames={campaign.pitch.frames}
      defaultProps={{
        nativeServer: "http://127.0.0.1:3357",
        mode: "campaign",
        cut: "pitch",
      }}
    />
    <Composition
      id="NdpClioSocial"
      component={NativeProductFilm}
      width={1080}
      height={1920}
      fps={60}
      durationInFrames={campaign.social.frames}
      defaultProps={{
        nativeServer: "http://127.0.0.1:3357",
        mode: "campaign",
        cut: "social",
      }}
    />
    <Composition
      id="ClioNativePromo"
      component={NativeProductFilm}
      width={1920}
      height={1080}
      fps={60}
      durationInFrames={FILM_FRAMES}
      defaultProps={{ nativeServer: "http://127.0.0.1:3357" }}
    />
    <Composition
      id="ClioProof"
      component={ClioProof}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={FRAMES}
      defaultProps={{ cameraScale: 1, cameraX: 960, cameraY: 540 }}
    />
    <Composition
      id="ClioComponents"
      component={ComponentGallery}
      width={1920}
      height={1080}
      fps={60}
      durationInFrames={360}
      defaultProps={{ focus: "overview", cameraScale: 1 }}
    />
  </>
);
