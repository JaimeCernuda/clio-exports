import React from "react";
import { AbsoluteFill, OffthreadVideo, useCurrentFrame } from "remotion";
import { MousePointer2Icon } from "lucide-react";
import { cursorAt, type CursorKey } from "../native/cursor-plan";

export type CursorCompositeProps = {
  video: string;
  frames: number;
  track: CursorKey[];
};

/** Keep pointer choreography editable without recording the unchanged native UI again. */
export function CursorComposite({
  video,
  frames,
  track,
}: CursorCompositeProps) {
  const frame = useCurrentFrame(),
    point = cursorAt(track, frame, frames);
  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={video}
        muted
        style={{ width: "100%", height: "100%" }}
      />
      <div
        style={{
          position: "absolute",
          left: point.x,
          top: point.y,
          opacity: point.opacity,
          pointerEvents: "none",
          filter: "drop-shadow(0 1px 1px #16304450)",
        }}
      >
        {point.pulse > 0 && (
          <span
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: point.size,
              height: point.size,
              border: "1px solid #30aeb180",
              borderRadius: "50%",
              opacity: point.pulse,
              transform: `translate(-50%,-50%) scale(${1 + (1 - point.pulse) * 2})`,
            }}
          />
        )}
        <MousePointer2Icon
          size={point.size}
          fill="white"
          stroke="#123245"
          strokeWidth={1.5}
          style={{
            transform: `translate(${-point.size / 6}px,${-point.size / 6}px)`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}
