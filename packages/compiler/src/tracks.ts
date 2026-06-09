/**
 * Track allocator (§6.3). Assigns each panel a `data-track-index` such that
 * panels overlapping in time get distinct tracks (deterministic greedy packing
 * by start time). Audio clips live on a dedicated high band so the producer's
 * audio mix never collides with visual layering.
 */

export interface Clip {
  id: string;
  start: number;
  end: number;
  audio: boolean;
}

export const VISUAL_TRACK_BASE = 1;
export const AUDIO_TRACK_BASE = 1000;
const EPS = 1e-6;

export function allocateTracks(clips: Clip[]): Map<string, number> {
  const out = new Map<string, number>();
  // Stable order: by start, then by id, so allocation is deterministic.
  const visual = clips
    .filter((c) => !c.audio)
    .slice()
    .sort((a, b) => a.start - b.start || (a.id < b.id ? -1 : 1));
  const audio = clips
    .filter((c) => c.audio)
    .slice()
    .sort((a, b) => a.start - b.start || (a.id < b.id ? -1 : 1));

  pack(visual, VISUAL_TRACK_BASE, out);
  pack(audio, AUDIO_TRACK_BASE, out);
  return out;
}

function pack(clips: Clip[], base: number, out: Map<string, number>): void {
  const trackEnds: number[] = []; // trackEnds[i] = last end on track base+i
  for (const clip of clips) {
    let placed = false;
    for (let i = 0; i < trackEnds.length; i++) {
      if ((trackEnds[i] ?? 0) <= clip.start + EPS) {
        trackEnds[i] = clip.end;
        out.set(clip.id, base + i);
        placed = true;
        break;
      }
    }
    if (!placed) {
      trackEnds.push(clip.end);
      out.set(clip.id, base + trackEnds.length - 1);
    }
  }
}
