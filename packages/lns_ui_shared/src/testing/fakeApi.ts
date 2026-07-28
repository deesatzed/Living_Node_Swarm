import type { CandidateGraphFixture } from "../api/types";
import { createNeodymiumGraphFixture } from "./graphFixture";
import { createNeodymiumTargetFixture } from "./neodymiumFixture";

export interface FixtureApi {
  createFixtureCandidateProposal(targetId: string): Promise<CandidateGraphFixture>;
}

export function createFixtureApi(): FixtureApi {
  const target = createNeodymiumTargetFixture();

  return {
    async createFixtureCandidateProposal(targetId: string): Promise<CandidateGraphFixture> {
      if (targetId !== target.id) {
        throw new Error(`Unknown deterministic fixture target: ${targetId}`);
      }
      return createNeodymiumGraphFixture();
    },
  };
}
