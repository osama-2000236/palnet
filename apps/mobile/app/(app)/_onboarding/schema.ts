import { z } from "zod";

import { currentYear } from "./types";

const required = "onboarding.validation.required";
const shortMax = z.string().trim().max(120, "onboarding.validation.shortMax");

export const onboardingSchema = z
  .object({
    firstName: z.string().trim().min(1, required).max(60, "onboarding.validation.nameMax"),
    lastName: z.string().trim().min(1, required).max(60, "onboarding.validation.nameMax"),
    identityConfirmed: z.boolean().refine((v) => v, "onboarding.validation.identity"),
    handle: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "onboarding.validation.handle")
      .max(30, "onboarding.validation.handle")
      .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "onboarding.validation.handle"),
    headline: z.string().trim().min(2, required).max(220, "onboarding.validation.headlineMax"),
    about: z.string().trim().max(4000, "onboarding.validation.aboutMax"),
    location: z.string().trim().min(2, required).max(120, "onboarding.validation.locationMax"),
    country: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "onboarding.validation.country"),
    backgroundKind: z.enum(["work", "education"], {
      errorMap: () => ({ message: "onboarding.validation.background" }),
    }),
    workTitle: shortMax,
    companyName: shortMax,
    workStartYear: z.string().trim(),
    workDescription: z.string().trim().max(4000, "onboarding.validation.aboutMax"),
    school: shortMax,
    degree: shortMax,
    fieldOfStudy: shortMax,
    networkMessage: z.string().trim().max(300, "onboarding.validation.networkMessage"),
  })
  .superRefine((v, ctx) => {
    if (v.backgroundKind === "work") {
      if (!v.workTitle.trim())
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["workTitle"], message: required });
      if (!v.companyName.trim())
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["companyName"], message: required });
      const year = Number(v.workStartYear);
      if (!/^\d{4}$/.test(v.workStartYear) || year < 1950 || year > currentYear)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["workStartYear"],
          message: "onboarding.validation.year",
        });
    }
    if (v.backgroundKind === "education" && !v.school.trim())
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["school"], message: required });
  });
export default () => null;
