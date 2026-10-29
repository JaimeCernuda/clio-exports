import { promptSegments } from "./prompt-segments";

/** Literal prompt text keeps tables, angle-bracket instructions and native source bindings intact. */
export function RecordedOpalPrompt({ text }: { text: string }) {
  return (
    <div className="recorded-opal-prompt">
      {promptSegments(text).map((part, index) => (
        <span key={index} data-prompt-section={part.kind}>
          {part.text}
        </span>
      ))}
    </div>
  );
}
