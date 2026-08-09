import { z } from "zod";

// Imported, not re-exported: `SuggestionReason` belongs to the scorer, and two
// export sites for one union is a name the barrel cannot resolve.
import { SuggestionReason } from "../ranking/suggestion-score";
import { FollowPerson, PersonGraphState } from "./follow";

// Who to show a member, and why.
//
// The suggestion endpoint today returns people ordered by profile freshness,
// with no occupation, governorate or alumni signal and no reason attached.
// FEED-RANKING.md's explainability rule generalises: if the product cannot say
// why it is showing somebody, it does not show them.

export const PeopleSuggestion = z.object({
  user: FollowPerson,
  graph: PersonGraphState,
  /**
   * The highest-weighted term that scored. Never null on the wire — a
   * candidate with no reason is not returned at all.
   */
  reason: z.nativeEnum(SuggestionReason),
  /**
   * The number the reason line renders, when it has one: mutual connections
   * for SHARED_CONNECTIONS, nothing for the rest.
   */
  reasonCount: z.number().int().nonnegative().nullable(),
  /** The occupation or institution the reason refers to, for the copy. */
  reasonKey: z.string().nullable(),
});
export type PeopleSuggestion = z.infer<typeof PeopleSuggestion>;

export const AlumniQuery = z.object({
  universityKey: z.string().min(1).max(80),
  graduationYearFrom: z.coerce.number().int().min(1900).max(2100).optional(),
  graduationYearTo: z.coerce.number().int().min(1900).max(2100).optional(),
});
export type AlumniQuery = z.infer<typeof AlumniQuery>;

export const DiasporaQuery = z.object({
  originGovernorate: z.string().min(1).max(80).optional(),
  residenceCountry: z.string().length(2).optional(),
  occupationKey: z.string().min(1).max(80).optional(),
});
export type DiasporaQuery = z.infer<typeof DiasporaQuery>;

export const NearbyQuery = z.object({
  governorateKey: z.string().min(1).max(80),
  occupationKey: z.string().min(1).max(80).optional(),
});
export type NearbyQuery = z.infer<typeof NearbyQuery>;

/** A person in a discovery list. Same shape everywhere, including search. */
export const DiscoveryPerson = z.object({
  user: FollowPerson,
  graph: PersonGraphState,
  location: z.string().nullable(),
});
export type DiscoveryPerson = z.infer<typeof DiscoveryPerson>;

// ponytail: no DismissSuggestionBody. `DELETE /discovery/people/:userId` takes
// its target in the path, and a body on a DELETE is a shape nobody needs.
