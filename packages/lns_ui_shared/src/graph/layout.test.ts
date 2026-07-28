import { describe, expect, it } from "vitest";
import { layoutHopGraph } from "./layout";
import { createNeodymiumGraphFixture } from "../testing/graphFixture";

describe("layoutHopGraph", () => {
  it("places the deterministic 30-factor fixture in non-overlapping hop layers", () => {
    const fixture = createNeodymiumGraphFixture();
    const layout = layoutHopGraph(fixture.factors, { width: 1200, height: 700 });
    expect(Object.keys(layout)).toHaveLength(30);
    const positions = Object.values(layout);
    expect(new Set(positions.map((point) => `${point.x}:${point.y}`)).size).toBe(30);
    expect(layout.weather_disruption.x).toBeLessThan(layout.refining_throughput.x);
  });
});
