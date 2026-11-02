/** Fragment-scoped text matching and deterministic layout interpolation. */
export interface WordBox {
  id: string;
  block: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: number;
  color: string;
  mono: boolean;
}

export interface SurfaceBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  background: string;
  border: string;
  radius: number;
}

export interface PromptLayout {
  words: WordBox[];
  boxes: SurfaceBox[];
  height: number;
}

export interface AnimatedWord extends WordBox {
  opacity: number;
  highlight: number;
  motion: "keep" | "insert" | "remove";
}

/** Restrained ease with zero endpoint velocity; never overshoots the layout. */
export function ease(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function phase(frame: number, at: number, duration: number): number {
  return ease((frame - at) / duration);
}

/** Longest ordered word match, confined to a single source fragment. */
export function matchWords(
  a: readonly WordBox[],
  b: readonly WordBox[],
): Map<number, number> {
  const lengths = Array.from(
    { length: a.length + 1 },
    () => new Uint32Array(b.length + 1),
  );
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lengths[i][j] =
        a[i].text === b[j].text
          ? 1 + lengths[i + 1][j + 1]
          : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
  const pairs: Array<[number, number]> = [];
  let i = 0,
    j = 0;
  while (i < a.length && j < b.length) {
    if (a[i].text === b[j].text) {
      pairs.push([i++, j++]);
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) i++;
    else j++;
  }
  // An isolated "a" or "and" in a replacement paragraph is not a useful
  // visual anchor. Exact paragraphs and contiguous phrases remain intact.
  return new Map(
    pairs.filter(([x, y], index) => {
      const previous = pairs[index - 1],
        next = pairs[index + 1];
      return (
        (a.length === b.length &&
          a.every((word, i) => word.text === b[i].text)) ||
        (previous && previous[0] === x - 1 && previous[1] === y - 1) ||
        (next && next[0] === x + 1 && next[1] === y + 1)
      );
    }),
  );
}

const blend = (a: number, b: number, t: number) => a + (b - a) * t;

/** Match each fragment independently; measure both layouts before moving words. */
export function morphWords(
  from: PromptLayout,
  to: PromptLayout,
  progress: number,
): AnimatedWord[] {
  const p = Math.max(0, Math.min(1, progress));
  const travel = ease(p);
  const output: AnimatedWord[] = [];
  const blocks = new Set([...from.words, ...to.words].map((w) => w.block));
  for (const block of blocks) {
    const a = from.words.filter((w) => w.block === block);
    const b = to.words.filter((w) => w.block === block);
    const matches = matchWords(a, b);
    const destinations = new Set(matches.values());
    a.forEach((word, i) => {
      const targetIndex = matches.get(i);
      const target = targetIndex === undefined ? undefined : b[targetIndex];
      if (target) {
        output.push({
          ...word,
          x: blend(word.x, target.x, travel),
          y: blend(word.y, target.y, travel),
          opacity: 1,
          highlight: 0,
          motion: "keep",
        });
      } else {
        output.push({
          ...word,
          id: `out:${word.id}`,
          y: word.y,
          opacity: 1 - ease(p / 0.38),
          highlight: 0,
          motion: "remove",
        });
      }
    });
    b.forEach((word, i) => {
      if (destinations.has(i)) return;
      // Let the old phrase leave and the layout open before revealing its
      // replacement. This avoids a ghosted double paragraph during a morph.
      const enter = ease((p - 0.36) / 0.58);
      output.push({
        ...word,
        id: `in:${word.id}`,
        y: word.y + 8 * (1 - enter),
        opacity: enter,
        highlight: Math.sin(Math.PI * enter) * 0.2,
        motion: "insert",
      });
    });
  }
  return output;
}

export function morphBoxes(
  from: PromptLayout,
  to: PromptLayout,
  progress: number,
): Array<SurfaceBox & { opacity: number }> {
  const t = ease(progress);
  const prior = new Map(from.boxes.map((box) => [box.id, box]));
  const after = new Map(to.boxes.map((box) => [box.id, box]));
  const boxes: Array<SurfaceBox & { opacity: number }> = [];
  for (const box of from.boxes) {
    const target = after.get(box.id);
    boxes.push(
      target
        ? {
            ...target,
            x: blend(box.x, target.x, t),
            y: blend(box.y, target.y, t),
            width: blend(box.width, target.width, t),
            height: blend(box.height, target.height, t),
            opacity: 1,
          }
        : { ...box, height: box.height * (1 - t), opacity: 1 - t },
    );
  }
  for (const box of to.boxes)
    if (!prior.has(box.id))
      boxes.push({ ...box, height: box.height * t, opacity: t });
  return boxes;
}
