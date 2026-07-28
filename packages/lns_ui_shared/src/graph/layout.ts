import type { CandidateFactor } from "../api/types";

export interface GraphPoint { x: number; y: number }

export function layoutHopGraph(
  factors: CandidateFactor[],
  { width, height }: { width: number; height: number },
): Record<string, GraphPoint> {
  const layers = new Map<number, CandidateFactor[]>();
  for (const factor of factors) layers.set(factor.hop_distance, [...(layers.get(factor.hop_distance) ?? []), factor]);
  const maxHop = Math.max(...layers.keys());
  const result: Record<string, GraphPoint> = {};
  for (const [hop, layer] of layers) {
    layer.sort((a, b) => a.rank - b.rank).forEach((factor, index) => {
      result[factor.id] = { x: Math.round(((maxHop - hop + 1) / (maxHop + 1)) * width), y: Math.round(((index + 1) / (layer.length + 1)) * height) };
    });
  }
  return result;
}
