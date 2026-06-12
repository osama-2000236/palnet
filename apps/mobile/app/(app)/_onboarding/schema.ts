import * as yup from "yup";

import { currentYear, type BackgroundKind } from "./types";

export const onboardingSchema = yup.object({
  firstName: yup
    .string()
    .trim()
    .min(1, "onboarding.validation.required")
    .max(60, "onboarding.validation.nameMax")
    .required("onboarding.validation.required"),
  lastName: yup
    .string()
    .trim()
    .min(1, "onboarding.validation.required")
    .max(60, "onboarding.validation.nameMax")
    .required("onboarding.validation.required"),
  identityConfirmed: yup
    .boolean()
    .oneOf([true], "onboarding.validation.identity")
    .required("onboarding.validation.identity"),
  handle: yup
    .string()
    .trim()
    .lowercase()
    .min(3, "onboarding.validation.handle")
    .max(30, "onboarding.validation.handle")
    .matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "onboarding.validation.handle")
    .required("onboarding.validation.required"),
  headline: yup
    .string()
    .trim()
    .min(2, "onboarding.validation.required")
    .max(220, "onboarding.validation.headlineMax")
    .required("onboarding.validation.required"),
  about: yup.string().trim().max(4000, "onboarding.validation.aboutMax").defined(),
  location: yup
    .string()
    .trim()
    .min(2, "onboarding.validation.required")
    .max(120, "onboarding.validation.locationMax")
    .required("onboarding.validation.required"),
  country: yup
    .string()
    .trim()
    .uppercase()
    .matches(/^[A-Z]{2}$/, "onboarding.validation.country")
    .required("onboarding.validation.required"),
  backgroundKind: yup
    .mixed<BackgroundKind>()
    .oneOf(["work", "education"], "onboarding.validation.background")
    .required("onboarding.validation.background"),
  workTitle: yup
    .string()
    .trim()
    .max(120, "onboarding.validation.shortMax")
    .test({
      name: "work-title-required",
      message: "onboarding.validation.required",
      test(value) {
        return this.parent.backgroundKind !== "work" || Boolean(value?.trim());
      },
    }),
  companyName: yup
    .string()
    .trim()
    .max(120, "onboarding.validation.shortMax")
    .test({
      name: "company-required",
      message: "onboarding.validation.required",
      test(value) {
        return this.parent.backgroundKind !== "work" || Boolean(value?.trim());
      },
    }),
  workStartYear: yup
    .string()
    .trim()
    .test({
      name: "work-year",
      message: "onboarding.validation.year",
      test(value) {
        if (this.parent.backgroundKind !== "work") return true;
        const year = Number(value);
        return /^\d{4}$/.test(value ?? "") && year >= 1950 && year <= currentYear;
      },
    }),
  workDescription: yup.string().trim().max(4000, "onboarding.validation.aboutMax").defined(),
  school: yup
    .string()
    .trim()
    .max(120, "onboarding.validation.shortMax")
    .test({
      name: "school-required",
      message: "onboarding.validation.required",
      test(value) {
        return this.parent.backgroundKind !== "education" || Boolean(value?.trim());
      },
    }),
  degree: yup.string().trim().max(120, "onboarding.validation.shortMax").defined(),
  fieldOfStudy: yup.string().trim().max(120, "onboarding.validation.shortMax").defined(),
  networkMessage: yup.string().trim().max(300, "onboarding.validation.networkMessage").defined(),
});
export default () => null;
