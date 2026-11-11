import { useLayoutEffect, useState } from "react";
import { RecordedPointer } from "./recorded-pointer";
import { buildPocketCues } from "./spotter-pocket-plan";
import { cursorAt, type CursorKey } from "./cursor-plan";
import type { PairedReplay } from "./paired-replay";

/** Measured native tab/row gestures enter and leave through the frame edge, never dissolve or teleport. */
export function PocketPointer({
  pair,
  frame,
}: {
  pair: PairedReplay;
  frame: number;
}) {
  const [pose, setPose] = useState<
    ReturnType<typeof cursorAt> & { frame: number }
  >();
  useLayoutEffect(() => {
    const parking = { x: innerWidth - 20, y: innerHeight + 55 };
    const keys: CursorKey[] = [
      { at: 0, sampleAt: 0, kind: "button", size: 23, ...parking },
    ];
    const cues = buildPocketCues(pair).filter((c) => c.at >= 420);
    for (const [i, cue] of cues.entries()) {
      const label = {
        provenance: "Provenance",
        evidence: "Evidence",
        spotter: "SPOTTER",
      }[cue.tab];
      const tab = Array.from(
        document.querySelectorAll<HTMLElement>('.paired-canvas [role="tab"]'),
      ).find((el) => el.textContent?.includes(label));
      if (!tab) continue;
      const rect = tab.getBoundingClientRect();
      const target = {
        x: rect.left + Math.min(rect.width * 0.5, 85),
        y: rect.top + rect.height * 0.5,
      };
      const previous = cues[i - 1];
      if (previous?.tab === cue.tab && !cue.focus) continue;
      if (cue.focus && previous?.tab === cue.tab) {
        const row = document.querySelector<HTMLElement>(
          `.paired-pocket-view:not([hidden]) [data-evidence-row="${Number(cue.focus.replace("row-", ""))}"]`,
        );
        if (row) {
          const r = row.getBoundingClientRect();
          target.x = r.left + r.width * 0.5;
          target.y = r.top + r.height * 0.5;
        }
      }
      const last = keys.at(-1)!.at;
      if (cue.at - 44 <= last) continue;
      const add = (at: number, p: typeof parking, pulse = false) =>
        keys.push({
          at,
          sampleAt: at,
          kind: "button",
          size: 23,
          ...p,
          pulse,
          travelFrames: 42,
        });
      add(cue.at - 44, parking);
      add(cue.at, target, true);
      add(cue.at + 14, target);
      add(cue.at + 56, parking);
    }
    const value = cursorAt(
      keys,
      Math.max(0, frame),
      Math.max(frame + 100, keys.at(-1)!.at + 100),
    );
    setPose({ ...value, opacity: 1, frame });
  }, [pair, frame]);
  return <RecordedPointer pose={pose} frame={pose?.frame} />;
}
