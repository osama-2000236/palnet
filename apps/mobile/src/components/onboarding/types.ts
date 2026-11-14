export type BackgroundKind = "work" | "education";
export type StepKey = "identity" | "profile" | "location" | "background" | "photo" | "network";

export interface OnboardingFormValues {
  firstName: string;
  lastName: string;
  identityConfirmed: boolean;
  handle: string;
  headline: string;
  about: string;
  location: string;
  country: string;
  backgroundKind: BackgroundKind;
  workTitle: string;
  companyName: string;
  workStartYear: string;
  workDescription: string;
  school: string;
  degree: string;
  fieldOfStudy: string;
  networkMessage: string;
}
