import { useLayoutEffect, useRef } from "react";
import {
  AbsoluteFill,
  IFrame,
  cancelRender,
  continueRender,
  delayRender,
  useCurrentFrame,
  Composition,
  registerRoot,
} from "remotion";
import {
  engineeringFrames,
  type EngineeringPart,
} from "../native/engineering-plan";
import { ENGINEERING_FILM_FRAMES } from "../native/engineering-film-plan";
/** Wait for each native data/mesh paint, including out-of-order frame seeks. */
function EngineeringFilm({ part }: { part: EngineeringPart | "full" }) {
  const frame = useCurrentFrame(),
    iframe = useRef<HTMLIFrameElement>(null),
    nonce = useRef(0);
  const url =
    "http://127.0.0.1:3365/engineering.html?mode=film&render=1&" +
    (part === "full" ? "cut=full" : "part=" + part);
  useLayoutEffect(() => {
    const id = ++nonce.current,
      handle = delayRender("Engineering " + part + " frame " + frame, {
        timeoutInMilliseconds: 120000,
      });
    let done = false;
    const send = () =>
      iframe.current?.contentWindow?.postMessage(
        { kind: "clio-film-frame", frame, nonce: id },
        "http://127.0.0.1:3365",
      );
    const receive = (event: MessageEvent) => {
      if (
        event.source !== iframe.current?.contentWindow ||
        event.origin !== "http://127.0.0.1:3365"
      )
        return;
      if (event.data?.kind === "clio-film-boot") send();
      if (event.data?.kind === "clio-film-error")
        cancelRender(new Error(event.data.message));
      if (
        event.data?.kind === "clio-film-ready" &&
        event.data.frame === frame &&
        event.data.nonce === id &&
        !done
      ) {
        done = true;
        continueRender(handle);
      }
    };
    addEventListener("message", receive);
    const timer = setInterval(send, 500);
    send();
    return () => {
      clearInterval(timer);
      removeEventListener("message", receive);
      if (!done) continueRender(handle);
    };
  }, [frame, part]);
  return (
    <AbsoluteFill>
      <IFrame
        ref={iframe}
        src={url}
        title="CLIO native engineering sketch"
        style={{ width: 1280, height: 720, border: 0 }}
      />
    </AbsoluteFill>
  );
}
function Root() {
  return (
    <>
      {(["sweep", "studio", "full"] as const).map((part) => (
        <Composition
          key={part}
          id={
            part === "full"
              ? "EngineeringWalkthrough"
              : part === "sweep"
                ? "EngineeringSweepSketch"
                : "EngineeringStudioSketch"
          }
          component={EngineeringFilm}
          width={1280}
          height={720}
          fps={60}
          durationInFrames={
            part === "full" ? ENGINEERING_FILM_FRAMES : engineeringFrames(part)
          }
          defaultProps={{ part }}
        />
      ))}
    </>
  );
}
registerRoot(Root);
