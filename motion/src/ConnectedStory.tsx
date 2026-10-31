import React from "react";
import {
  AbsoluteFill,
  Freeze,
  Img,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import storyJson from "../story/ndp-connected.json";
import {
  buildStoryPlan,
  type StorySpec,
  type StoryCardSpec,
} from "./story-plan";

export const connectedStory = storyJson as StorySpec;
export const connectedPlan = buildStoryPlan(connectedStory);
const ease = (frame: number, start: number, end: number) => {
  const t = Math.max(0, Math.min(1, (frame - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

function Brand({ large = false }: { large?: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        left: large ? 640 : 1410,
        top: large ? 290 : 24,
        transform: large ? undefined : "scale(.675)",
        transformOrigin: "0 0",
        width: 640,
        height: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      <Img src={staticFile("story/ndp-light.png")} style={{ width: 330 }} />
      <span
        style={{
          fontSize: 38,
          color: "#8493a3",
          fontWeight: 300,
          margin: "0 4px",
        }}
      >
        +
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 15,
          fontSize: 56,
          fontWeight: 650,
          letterSpacing: "-.025em",
          color: "#102e45",
        }}
      >
        <Img
          src={staticFile("clio-mark.svg")}
          style={{ width: 56, height: 56 }}
        />
        CLIO
      </div>
    </div>
  );
}

/** Editable narrative links identify source changes without inventing another agent run. */
export function StoryCardView({
  card,
  frame,
}: {
  card: StoryCardSpec;
  frame: number;
}) {
  const reveal = ease(frame, 0, 28);
  if (card.id === "outro") {
    return (
      <AbsoluteFill
        style={{
          background: "#f5f5f1",
          color: "#0a2d55",
          fontFamily: "Inter Variable, sans-serif",
        }}
      >
        <AbsoluteFill style={{ opacity: reveal }}>
          <Brand large />
          <div
            style={{
              position: "absolute",
              top: 515,
              left: 150,
              right: 150,
              textAlign: "center",
              fontSize: 80,
              fontWeight: 550,
              lineHeight: 1.15,
              letterSpacing: "-.04em",
              whiteSpace: "pre-line",
              transform: `translateY(${12 * (1 - reveal)}px)`,
            }}
          >
            {card.question}
          </div>
          <div
            style={{
              position: "absolute",
              top: 790,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              gap: 90,
              fontSize: 28,
              color: "#526980",
              opacity: ease(frame, 45, 80),
            }}
          >
            <span>nationaldataplatform.org</span>
            <span>clio.iowarp.ai</span>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  const change = ease(frame, 20, 80);
  const focusIndex =
    card.fromPublisher + (card.publisher - card.fromPublisher) * change;
  const questionIn = ease(
    frame,
    card.id === "intro" ? 8 : 75,
    card.id === "intro" ? 40 : 115,
  );
  const routeIn = ease(frame, 45, 115);
  const flow = ease(frame, 95, 205);
  const sourceY = 472 + card.publisher * 130;
  const t = Math.min(1, flow * 1.7);
  const pointX =
    flow <= 1 / 1.7
      ? (1 - t) ** 3 * 660 +
        3 * (1 - t) ** 2 * t * 760 +
        3 * (1 - t) * t * t * 760 +
        t ** 3 * 880
      : 1120 + (1360 - 1120) * ((flow - 1 / 1.7) / (1 - 1 / 1.7));
  const pointY =
    flow <= 1 / 1.7 ? sourceY + (602 - sourceY) * t * t * (3 - 2 * t) : 602;
  return (
    <AbsoluteFill
      style={{
        background: "#f5f5f1",
        color: "#0a2d55",
        fontFamily: "Inter Variable, sans-serif",
      }}
    >
      <Brand />
      <div
        style={{
          position: "absolute",
          top: 154,
          left: 150,
          fontSize: 23,
          fontWeight: 600,
          letterSpacing: ".14em",
          color: "#527282",
          opacity: reveal,
        }}
      >
        {card.kicker}
      </div>
      <div
        style={{
          position: "absolute",
          top: 204,
          left: 145,
          right: 100,
          fontSize: 76,
          fontWeight: 550,
          lineHeight: 1.08,
          letterSpacing: "-.045em",
          whiteSpace: "pre-line",
          opacity: questionIn,
          transform: `translateY(${16 * (1 - questionIn)}px)`,
        }}
      >
        {card.question}
      </div>
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", inset: 0, opacity: ease(frame, 15, 45) }}
      >
        {connectedStory.publishers.map((publisher, index) => {
          const y = 472 + index * 130;
          const active = Math.max(0, 1 - Math.abs(focusIndex - index));
          const path = `M 660 ${y} C 760 ${y}, 760 602, 880 602`;
          return (
            <g key={publisher.id}>
              <path d={path} fill="none" stroke="#c9d9df" strokeWidth={2} />
              <path
                d={path}
                fill="none"
                stroke="#1499ad"
                strokeWidth={3}
                strokeDasharray={500}
                strokeDashoffset={500 * (1 - routeIn)}
                opacity={active}
              />
            </g>
          );
        })}
        <path d="M 1120 602 L 1360 602" stroke="#c9d9df" strokeWidth={2} />
        <path
          d="M 1120 602 L 1360 602"
          stroke="#1499ad"
          strokeWidth={3}
          strokeDasharray={240}
          strokeDashoffset={240 * (1 - routeIn)}
        />
        {flow > 0 && flow < 1 && (
          <circle cx={pointX} cy={pointY} r={7} fill="#1499ad" />
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 386,
          fontSize: 19,
          letterSpacing: ".04em",
          color: "#70858f",
          opacity: reveal,
        }}
      >
        NDP collections
      </div>
      <div
        style={{
          position: "absolute",
          left: 146,
          top: 416 + focusIndex * 130,
          width: 518,
          height: 112,
          border: "2px solid #37a9b9",
          borderRadius: 17,
          background: "#e7f2f4",
          opacity: ease(frame, 10, 40),
        }}
      />
      {connectedStory.publishers.map((publisher, index) => {
        const active = Math.max(0, 1 - Math.abs(focusIndex - index));
        return (
          <div
            key={publisher.id}
            style={{
              position: "absolute",
              left: 172,
              top: 439 + index * 130,
              width: 470,
              opacity:
                ease(frame, 8 + index * 9, 35 + index * 9) *
                (0.38 + 0.62 * active),
            }}
          >
            <div
              style={{
                fontSize: 29,
                fontWeight: 600,
                letterSpacing: "-.025em",
              }}
            >
              {publisher.short}
            </div>
            <div style={{ fontSize: 23, marginTop: 7, color: "#527282" }}>
              {publisher.dataset}
            </div>
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 880,
          top: 537,
          width: 240,
          height: 130,
          borderRadius: 19,
          border: "1px solid #cadce2",
          background: "#fff",
          display: "grid",
          placeItems: "center",
          opacity: ease(frame, 35, 75),
        }}
      >
        <Img src={staticFile("story/ndp-light.png")} style={{ width: 210 }} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 1360,
          top: 529,
          width: 330,
          height: 146,
          borderRadius: 21,
          border: "1px solid #9dc4cf",
          background: "#eef7f8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          fontSize: 61,
          fontWeight: 600,
          color: "#102e45",
          opacity: ease(frame, 65, 105),
          transform: `translateX(${12 * (1 - ease(frame, 65, 105))}px)`,
        }}
      >
        <Img
          src={staticFile("clio-mark.svg")}
          style={{ width: 79, height: 79 }}
        />
        CLIO
      </div>
    </AbsoluteFill>
  );
}

/** Render one reusable bridge for the fast assembly path. */
export const StoryCard: React.FC<{ cardId: string }> = ({ cardId }) => {
  const frame = useCurrentFrame();
  const card = connectedStory.cards.find((value) => value.id === cardId);
  if (!card) throw new Error(`Unknown story card ${cardId}`);
  return <StoryCardView card={card} frame={frame} />;
};

function StoryLayer({
  segment,
  mediaServer,
}: {
  segment: (typeof connectedPlan.segments)[number];
  mediaServer: string;
}) {
  const frame = useCurrentFrame();
  const opacity =
    segment.index === 0
      ? 1
      : Math.min(1, frame / connectedStory.crossfadeFrames);
  return (
    <AbsoluteFill style={{ opacity }}>
      {segment.kind === "card" ? (
        <StoryCard cardId={segment.cardId} />
      ) : (
        <Freeze frame={Math.min(frame, segment.outFrame - segment.inFrame - 1)}>
          <OffthreadVideo
            src={`${mediaServer}/story-media/${segment.file}`}
            trimBefore={segment.inFrame}
            trimAfter={segment.outFrame}
            muted
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </Freeze>
      )}
    </AbsoluteFill>
  );
}

/** One editable editorial composition, using continuous moving native renders as cached actors. */
export const ConnectedStory: React.FC<{
  mediaServer?: string;
  frameOffset?: number;
}> = ({ mediaServer = connectedStory.mediaServer, frameOffset = 0 }) => (
  <AbsoluteFill style={{ background: "#f5f5f1" }}>
    <Sequence from={-frameOffset}>
      {connectedPlan.segments.map((segment) => (
        <Sequence
          key={segment.id}
          from={segment.start}
          durationInFrames={segment.frames}
        >
          <StoryLayer segment={segment} mediaServer={mediaServer} />
        </Sequence>
      ))}
    </Sequence>
  </AbsoluteFill>
);
