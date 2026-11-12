import { useCurrentFrame } from "remotion";
import { NativeProductFilm } from "./NativeProductFilm";
import manifest from "../native/spotter-text-repairs.json";

/** Render source-linked repair intervals sequentially; the assembly places them on their original film frames. */
export function SpotterTextRepairs({
  frames = manifest.frames,
}: {
  frames?: readonly number[];
}) {
  const frame = useCurrentFrame();
  const target = frames[frame];
  if (target === undefined) throw new Error("Unknown text repair frame");
  return (
    <NativeProductFilm
      nativeServer="http://127.0.0.1:3359"
      mode="spotter"
      pairFile="opal-chainB-7795459.native.json"
      attentionFile="chainB-7795459-attention.json"
      spotterFilm
      recordCursor
      frameOffset={target - frame}
    />
  );
}
