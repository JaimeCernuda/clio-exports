import React, { useLayoutEffect, useRef } from "react";
import {
  AbsoluteFill,
  IFrame,
  cancelRender,
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import story from "../native/film-story.json";
import { campaignStory, type CampaignId } from "../native/campaign-catalog";
import { inspectionUiFrame } from "../native/cursor-plan";
import type { FocusBeat } from "../native/presentation-plan";

/** Host the editable native React stage; each captured frame waits for its paint acknowledgement. */
export const NativeProductFilm: React.FC<{
  nativeServer?: string;
  mode?: "film" | "campaign" | "spotter";
  pairFile?: string;
  attentionFile?: string;
  attentionShot?: string;
  spotterFilm?: boolean;
  cut?: "pitch" | "social";
  frameOffset?: number;
  campaignId?: CampaignId;
  debugLayout?: boolean;
  recordCursor?: boolean;
  inspectionFocus?: FocusBeat;
}> = ({
  nativeServer = "http://127.0.0.1:3357",
  mode = "film",
  pairFile = "opal-spotter.native.json",
  attentionFile,
  attentionShot,
  spotterFilm = false,
  cut = "pitch",
  frameOffset = 0,
  campaignId = "tahoe",
  debugLayout = false,
  recordCursor = false,
  inspectionFocus,
}) => {
  const localFrame = useCurrentFrame();
  const frame =
    (recordCursor && inspectionFocus
      ? inspectionUiFrame(inspectionFocus, localFrame)
      : localFrame) + frameOffset;
  const { width, height } = useVideoConfig();
  const iframe = useRef<HTMLIFrameElement>(null);
  const nonce = useRef(0);
  const url = new URL("/?render=1", nativeServer);
  if (recordCursor) url.searchParams.set("cursor", "record");
  url.searchParams.set("mode", mode);
  if (mode === "spotter") {
    url.searchParams.set("pair", pairFile);
    if (attentionFile) url.searchParams.set("attention", attentionFile);
    if (attentionShot) url.searchParams.set("attentionShot", attentionShot);
    if (spotterFilm) url.searchParams.set("spotterFilm", "1");
  }
  if (mode === "campaign") {
    url.searchParams.set("cut", cut);
    url.searchParams.set("campaign", campaignId);
  }
  url.searchParams.set(
    "scene",
    mode === "campaign" ? campaignStory(campaignId).sceneFile : story.sceneFile,
  );
  useLayoutEffect(() => {
    const id = ++nonce.current;
    const handle = delayRender(`Native CLIO frame ${frame}`, {
      timeoutInMilliseconds: 120000,
    });
    let finished = false;
    const send = () =>
      iframe.current?.contentWindow?.postMessage(
        { kind: "clio-film-frame", frame, nonce: id },
        url.origin,
      );
    const receive = (event: MessageEvent) => {
      if (
        event.source !== iframe.current?.contentWindow ||
        event.origin !== url.origin
      )
        return;
      if (event.data?.kind === "clio-film-boot") send();
      if (event.data?.kind === "clio-film-error") {
        cancelRender(new Error(event.data.message));
        return;
      }
      if (
        event.data?.kind === "clio-film-ready" &&
        event.data.frame === frame &&
        event.data.nonce === id
      ) {
        if (!finished) {
          finished = true;
          if (debugLayout) console.error(JSON.stringify(event.data.layout));
          if (recordCursor)
            console.log(
              "__CLIO_CURSOR__" +
                JSON.stringify({ frame, pose: event.data.cursor }),
            );
          continueRender(handle);
        }
      }
    };
    window.addEventListener("message", receive);
    const interval = window.setInterval(send, 500);
    send();
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("message", receive);
      if (!finished) continueRender(handle);
    };
  }, [frame, url.origin]);
  return (
    <AbsoluteFill style={{ background: "#f5f5f1" }}>
      <IFrame
        ref={iframe}
        src={url.href}
        title="CLIO native product film"
        style={{ width, height, border: 0 }}
      />
    </AbsoluteFill>
  );
};
