export interface StoryPublisher {
  id: string;
  short: string;
  name: string;
  dataset: string;
  datasetId: string;
}

export interface StoryCardSpec {
  id: string;
  frames: number;
  kicker: string;
  question: string;
  publisher: number;
  fromPublisher: number;
  context?: string;
}

export interface StoryClip {
  id: string;
  kind: "clip";
  campaign: string;
  file: string;
  sha256: string;
  sourceFrames: number;
  inFrame: number;
  outFrame: number;
  holdFrames: number;
}

export interface StoryCard {
  id: string;
  kind: "card";
  cardId: string;
}

export interface StorySpec {
  schema: string;
  title: string;
  fps: number;
  width: number;
  height: number;
  crossfadeFrames: number;
  mediaServer: string;
  publishers: StoryPublisher[];
  cards: StoryCardSpec[];
  segments: Array<StoryClip | StoryCard>;
}

/** Validate editorial inputs and resolve one frame-exact, overlapping film timeline. */
export function buildStoryPlan(story: StorySpec) {
  if (
    story.schema !== "clio.connected-story.v1" ||
    story.fps !== 60 ||
    story.width !== 1920 ||
    story.height !== 1080
  )
    throw new Error(
      "The story requires the established 1080p/60 source format",
    );
  if (!Number.isInteger(story.crossfadeFrames) || story.crossfadeFrames < 1)
    throw new Error("Story crossfade needs a positive frame count");
  if (
    new Set(story.segments.map((segment) => segment.id)).size !==
    story.segments.length
  )
    throw new Error("Story segment IDs must be unique");
  if (story.segments.some((segment) => !/^[a-z0-9-]+$/.test(segment.id)))
    throw new Error("Unsafe story segment ID");
  if (new Set(story.cards.map((card) => card.id)).size !== story.cards.length)
    throw new Error("Story card IDs must be unique");
  let end = 0;
  const segments = story.segments.map((segment, index) => {
    let frames: number;
    if (segment.kind === "card") {
      const card = story.cards.find((value) => value.id === segment.cardId);
      if (
        !card ||
        !Number.isInteger(card.frames) ||
        card.frames <= story.crossfadeFrames * 2 ||
        !story.publishers[card.publisher] ||
        !story.publishers[card.fromPublisher]
      )
        throw new Error(`Invalid story card ${segment.cardId}`);
      frames = card.frames;
    } else {
      if (
        !/^[a-z0-9-]+\.mp4$/.test(segment.file) ||
        !/^[a-f0-9]{64}$/.test(segment.sha256)
      )
        throw new Error(`Invalid source identity ${segment.id}`);
      if (
        ![
          segment.inFrame,
          segment.outFrame,
          segment.sourceFrames,
          segment.holdFrames,
        ].every(Number.isInteger) ||
        segment.inFrame < 0 ||
        segment.outFrame > segment.sourceFrames ||
        segment.outFrame <= segment.inFrame ||
        segment.holdFrames < 0
      )
        throw new Error(`Invalid source range ${segment.id}`);
      frames = segment.outFrame - segment.inFrame + segment.holdFrames;
    }
    if (frames <= story.crossfadeFrames * 2)
      throw new Error(`Story segment too short: ${segment.id}`);
    const start = index === 0 ? 0 : end - story.crossfadeFrames;
    end = start + frames;
    return { ...segment, index, start, end, frames };
  });
  if (!segments.length) throw new Error("Story has no segments");
  return { frames: end, segments };
}

/** Map a film frame to active layers and their original source frames, including result holds. */
export function storyAt(story: StorySpec, frame: number) {
  const plan = buildStoryPlan(story);
  if (!Number.isInteger(frame) || frame < 0 || frame >= plan.frames)
    throw new Error("Story frame outside timeline");
  return plan.segments
    .filter((segment) => frame >= segment.start && frame < segment.end)
    .map((segment) => ({
      ...segment,
      localFrame: frame - segment.start,
      opacity:
        segment.index === 0
          ? 1
          : Math.min(1, (frame - segment.start) / story.crossfadeFrames),
      sourceFrame:
        segment.kind === "clip"
          ? Math.min(
              segment.outFrame - 1,
              segment.inFrame + frame - segment.start,
            )
          : undefined,
    }));
}
