import { createContext, useContext } from "react";
import type { SharedNowOptions } from "@clio-ui/lib/shared-clock";

/** UI elapsed-time labels consume captured time; network/cache deadlines keep their real clocks. */
export const RecordedClock = createContext<number | undefined>(undefined);

/** Production clock-hook contract, bound to the immutable replay frame rather than today's date. */
export function useSharedNow(
  _ticking: boolean,
  _options: SharedNowOptions = {},
): number {
  const now = useContext(RecordedClock);
  if (now === undefined)
    throw new Error(
      "Native elapsed-time UI requires the recorded replay clock",
    );
  return now;
}
export type { SharedNowOptions };
