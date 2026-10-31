import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { FlowRun } from "@clio/core/v3";

import type { StudyChoices } from "./study-types";
export type { StudyChoices } from "./study-types";
export const StudyControls = createContext<{
  choices: StudyChoices;
  now?: number;
  flow?: FlowRun;
  change?: (key: string, value: unknown) => void;
}>({ choices: {} });

/** Native elapsed-time labels use the recorded clock, including during inspections. */
export function useRecordedStudyNow(_ticking: boolean): number {
  const { now } = useContext(StudyControls);
  if (now === undefined) throw new Error("Study clock is unavailable");
  return now;
}

/** Feed the native choice binding, so its real table query updates the rendered boards. */
export function useRecordedStudySeed(props: {
  label?: string;
  value?: unknown;
  setValue: (value: string[]) => void;
}) {
  const { choices } = useContext(StudyControls);
  const seed = choices.seed;
  useLayoutEffect(() => {
    if (
      props.label !== "Game (seed)" ||
      !seed ||
      JSON.stringify(props.value) === JSON.stringify([`Seed ${seed}`])
    )
      return;
    props.setValue([`Seed ${seed}`]);
  }, [props.label, props.value, props.setValue, seed]);
}

/** Native inline flow cards share the study clock, rather than polling final snapshots. */
export function useRecordedStudyFlow(handle: string) {
  const { flow } = useContext(StudyControls);
  return flow?.root_handle === handle ? flow : undefined;
}

export function useRecordedStudyTool(
  id: string,
  initial: boolean,
): [boolean, Dispatch<SetStateAction<boolean>>] {
  const { choices } = useContext(StudyControls);
  const [local, setLocal] = useState(initial);
  return [choices.toolCall ? choices.toolCall === id : local, setLocal];
}

/** Control native selections for frame seeking; ordinary readers retain working controls. */
export function useRecordedStudyChoice<T>(
  key: keyof StudyChoices,
  initial?: T,
): [T, Dispatch<SetStateAction<T>>] {
  const context = useContext(StudyControls);
  const [local, setLocal] = useState(initial as T);
  const value = Object.hasOwn(context.choices, key)
    ? (context.choices[key] as T)
    : local;
  return [
    value,
    (next) => {
      const resolved =
        typeof next === "function" ? (next as (v: T) => T)(value) : next;
      setLocal(resolved);
      context.change?.(key, resolved);
    },
  ];
}

/** Open the recorded citation disclosure while retaining native source rows and reads. */
export function useRecordedStudySources(
  entry: string,
): [boolean, Dispatch<SetStateAction<boolean>>] {
  const context = useContext(StudyControls);
  const [local, setLocal] = useState(false);
  const value =
    context.choices.sourcesEntry === undefined
      ? local
      : context.choices.sourcesEntry === entry;
  return [
    value,
    (next) => {
      const resolved = typeof next === "function" ? next(value) : next;
      setLocal(resolved);
      context.change?.("sourcesEntry", resolved ? entry : "");
    },
  ];
}
