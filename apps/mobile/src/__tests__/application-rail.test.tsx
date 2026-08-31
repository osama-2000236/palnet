// StepRail rule 2 — "a closed rail must be paired with a sentence saying what
// happened" — is the whole point of this component. It used to be enforced by
// coincidence: WITHDRAWN got a note, REJECTED relied on a rejection reason that
// the DTO types as independently nullable. These lock the guarantee down.

import { render, screen } from "@testing-library/react-native";
import type { Job } from "@baydar/shared";

import { ApplicationRail } from "@/screens/jobs/ApplicationRail";

function job(viewer: Partial<Job["viewer"]>): Job {
  return {
    viewer: {
      hasApplied: true,
      bookmarkId: null,
      applicationStatus: null,
      rejectionReason: null,
      rejectionNote: null,
      ...viewer,
    },
  } as Job;
}

/** The closure sentences — NOT the step labels, which are always present and
 *  would let a silent greyed rail pass. */
const CLOSURE_KEYS = [
  "applications.withdrawnNote",
  "applications.closedNote",
  "jobs.rejectedTitle",
];
const closureShown = (): boolean => CLOSURE_KEYS.some((key) => screen.queryByText(key) !== null);

test.each(["REJECTED", "WITHDRAWN"] as const)(
  "a closed rail always explains itself — %s",
  (status) => {
    // No rejectionReason: the case that used to render a greyed rail and silence.
    render(<ApplicationRail job={job({ applicationStatus: status })} />);
    expect(screen.getByTestId("job-application-rail")).toBeTruthy();
    expect(closureShown()).toBe(true);
  },
);

test("a withdrawal is not described as a rejection", () => {
  render(<ApplicationRail job={job({ applicationStatus: "WITHDRAWN" })} />);
  expect(screen.getByText("applications.withdrawnNote")).toBeTruthy();
  expect(screen.queryByText("applications.closedNote")).toBeNull();
});

test("a rejection with a reason shows the reason, not the generic closure", () => {
  render(
    <ApplicationRail
      job={job({ applicationStatus: "REJECTED", rejectionReason: "POSITION_FILLED" })}
    />,
  );
  expect(screen.queryByText("applications.closedNote")).toBeNull();
  expect(screen.getByText("jobs.rejectedTitle")).toBeTruthy();
});

test("an open application renders the rail with no closure sentence", () => {
  render(<ApplicationRail job={job({ applicationStatus: "REVIEWING" })} />);
  expect(screen.getByTestId("job-step-rail")).toBeTruthy();
  expect(screen.queryByText("applications.withdrawnNote")).toBeNull();
  expect(screen.queryByText("applications.closedNote")).toBeNull();
});

test("renders nothing for a job the viewer never applied to", () => {
  const { toJSON } = render(<ApplicationRail job={job({ hasApplied: false })} />);
  expect(toJSON()).toBeNull();
});
