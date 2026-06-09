import { describe, it, expect } from "vitest";
import { allocateTracks, AUDIO_TRACK_BASE, VISUAL_TRACK_BASE, type Clip } from "./tracks.js";

describe("allocateTracks", () => {
  it("packs non-overlapping clips onto the same track", () => {
    const clips: Clip[] = [
      { id: "a", start: 0, end: 5, audio: false },
      { id: "c", start: 5, end: 8, audio: false },
    ];
    const t = allocateTracks(clips);
    expect(t.get("a")).toBe(VISUAL_TRACK_BASE);
    expect(t.get("c")).toBe(VISUAL_TRACK_BASE);
  });

  it("gives overlapping clips distinct tracks", () => {
    const clips: Clip[] = [
      { id: "a", start: 0, end: 5, audio: false },
      { id: "b", start: 2, end: 7, audio: false },
    ];
    const t = allocateTracks(clips);
    expect(t.get("a")).toBe(VISUAL_TRACK_BASE);
    expect(t.get("b")).toBe(VISUAL_TRACK_BASE + 1);
  });

  it("puts audio on the dedicated high band", () => {
    const clips: Clip[] = [
      { id: "v", start: 0, end: 5, audio: false },
      { id: "au", start: 0, end: 5, audio: true },
    ];
    const t = allocateTracks(clips);
    expect(t.get("v")).toBe(VISUAL_TRACK_BASE);
    expect(t.get("au")).toBe(AUDIO_TRACK_BASE);
  });

  it("is deterministic regardless of input order", () => {
    const a: Clip[] = [
      { id: "a", start: 0, end: 5, audio: false },
      { id: "b", start: 2, end: 7, audio: false },
    ];
    const b: Clip[] = [...a].reverse();
    expect([...allocateTracks(a)]).toEqual([...allocateTracks(b)]);
  });
});
