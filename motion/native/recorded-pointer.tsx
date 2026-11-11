import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cursorAt, type CursorKey } from "./cursor-plan";

/** One consistent pointer for the native setup and captured attention gestures. */
export function RecordedPointer({
  pose,
  frame,
}: {
  pose?: ReturnType<typeof cursorAt>;
  frame?: number;
}) {
  if (!pose) return null;
  return createPortal(
    <svg
      aria-hidden="true"
      data-slot="recorded-pointer"
      data-pointer-frame={frame}
      data-pointer-x={pose.x}
      data-pointer-y={pose.y}
      width="44"
      height="44"
      viewBox="0 0 44 44"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        transform: `translate(${pose.x - 8}px,${pose.y - 8}px)`,
        transition: "none",
        animation: "none",
        opacity: pose.opacity,
        pointerEvents: "none",
        zIndex: 2147483646,
      }}
    >
      {pose.pulse > 0 ? (
        <circle
          cx="8"
          cy="8"
          r={8 + 9 * (1 - pose.pulse)}
          fill="none"
          stroke="#11a4af"
          strokeWidth="2"
          opacity={pose.pulse}
        />
      ) : null}
      <path
        d="M8 8 L13.5 31 L18.5 22.5 L27 18 Z"
        fill="#143844"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>,
    document.body,
  );
}

/** Point at the measured native approval menu as its frame-controlled events unfold. */
export function RecordedSetupPointer({ frame }: { frame: number }) {
  const anchors = useRef<
    | { button: { x: number; y: number }; item?: { x: number; y: number } }
    | undefined
  >(undefined);
  const [pose, setPose] = useState<
    ReturnType<typeof cursorAt> & { frame: number }
  >();
  useLayoutEffect(() => {
    if (frame >= 300) {
      setPose(undefined);
      return;
    }
    let active = true;
    let id = 0;
    const measure = () => {
      if (!active) return;
      const button = Array.from(
        document.querySelectorAll<HTMLButtonElement>(".paired-composer button"),
      ).find((b) =>
        /^(Ask first|SPOTTER review)$/u.test(b.textContent?.trim() ?? ""),
      );
      if (!button) return;
      const r = button.getBoundingClientRect();
      if (!anchors.current || frame < 60)
        anchors.current = {
          ...anchors.current,
          button: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
        };
      const item = Array.from(
        document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'),
      ).find((b) => b.textContent?.includes("SPOTTER"));
      if (item) {
        const r = item.getBoundingClientRect();
        anchors.current.item = {
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
        };
      }
      const a = anchors.current;
      const key = (
        at: number,
        p: { x: number; y: number },
        pulse = false,
      ): CursorKey => ({
        at,
        sampleAt: at,
        kind: "button",
        size: 23,
        ...p,
        pulse,
      });
      const value = cursorAt(
        [
          key(0, { x: innerWidth - 20, y: innerHeight + 55 }),
          key(60, a.button, true),
          key(105, a.button),
          key(180, a.item ?? a.button, true),
          key(240, a.item ?? a.button),
          key(299, { x: innerWidth - 20, y: innerHeight + 55 }),
        ],
        frame,
        300,
      );
      setPose({
        ...value,
        opacity: 1,
        frame,
      });
    };
    void document.fonts.ready.then(() => {
      if (active) id = requestAnimationFrame(measure);
    });
    return () => {
      active = false;
      cancelAnimationFrame(id);
    };
  }, [frame]);
  return <RecordedPointer pose={pose} frame={pose?.frame} />;
}
