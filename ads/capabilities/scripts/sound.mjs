/** Original procedural music and interaction accents, keyed to the visual cue clock. */
import { writeFile } from "node:fs/promises";
export async function makeSound(film, output) {
  const rate = 48000,
    samples = new Float64Array(film.seconds * rate),
    seed = film.number * 104729;
  let state = seed;
  const noise = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2147483648 - 1;
  };
  const add = (at, duration, voice) => {
    const start = Math.round(at * rate),
      n = Math.round(duration * rate);
    for (let i = 0; i < n && start + i < samples.length; i++)
      if (start + i >= 0) samples[start + i] += voice(i / rate, i / n);
  };
  const chime = (at, f, strength = 0.022) =>
    add(
      at,
      1.2,
      (t) =>
        strength *
        (Math.sin(2 * Math.PI * f * t) +
          0.2 * Math.sin(2 * Math.PI * f * 2 * t)) *
        Math.exp(-t * 5) *
        (1 - Math.exp(-t * 90)),
    );
  const sweep = (at) => {
    let low = 0;
    add(at, 0.45, (t, p) => {
      low = 0.15 * noise() + 0.85 * low;
      return low * 0.16 * Math.sin(Math.PI * p) ** 2;
    });
  };
  const notes = [220, 261.626, 329.628, 293.665];
  for (let beat = 0; beat * 0.55 < film.seconds - 5; beat++) {
    const at = beat * 0.55;
    if (beat % 2 === 0)
      add(
        at,
        0.23,
        (t) =>
          0.024 *
          Math.sin(2 * Math.PI * 55 * t) *
          Math.exp(-t * 22) *
          (1 - Math.exp(-t * 200)),
      );
    if (beat % 4 === 0)
      chime(at, notes[(Math.floor(beat / 4) + film.number) % 4], 0.009);
  }
  for (const marker of film.markers) {
    sweep(Math.max(0, marker.at - 0.15));
    chime(
      marker.at + 0.1,
      notes[film.number % 4] * (marker.at === film.seconds - 5 ? 2 : 1),
      0.024,
    );
  }
  add(
    film.seconds - 5,
    4,
    (t) =>
      0.012 *
      (Math.sin(2 * Math.PI * 220 * t) + Math.sin(2 * Math.PI * 329.628 * t)) *
      Math.exp(-t * 1.5) *
      (1 - Math.exp(-t * 20)),
  );
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++)
    buffer.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767),
      44 + i * 2,
    );
  await writeFile(output, buffer);
}
