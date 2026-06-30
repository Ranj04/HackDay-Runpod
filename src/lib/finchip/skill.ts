import {
  CoachingResultSchema,
  FlawSchema,
  type CoachFlaw,
  type CoachingResult,
  type Flaw,
} from "@/lib/contracts";

export function createCoachFlawSkill(coachFlaw: CoachFlaw) {
  return async (input: Flaw): Promise<CoachingResult> => {
    const flaw = FlawSchema.parse(input);
    const coaching = await coachFlaw(flaw);
    return CoachingResultSchema.parse(coaching);
  };
}
