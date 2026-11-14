import type { Job } from "@baydar/shared";
import React from "react";
import { createRoot, type Root } from "react-dom/client";

import { apiCall } from "@/lib/api";

import { ApplyDialog } from "./ApplyDialog";

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock("@/lib/api", () => ({
  apiCall: jest.fn(),
}));

const mockApiCall = jest.mocked(apiCall);
const job = {
  id: "job-1",
  title: "Engineer",
  company: { name: "Baydar" },
} as Job;

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("ApplyDialog", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    React.act(() => root.unmount());
    container.remove();
  });

  function render(onApplied = jest.fn()): jest.Mock {
    React.act(() => {
      root.render(
        <ApplyDialog job={job} token="token" onClose={jest.fn()} onApplied={onApplied} />,
      );
    });
    return onApplied;
  }

  function submit(): void {
    const button = Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === "submitApplication",
    );
    if (!button) throw new Error("Submit button not found");
    button.click();
  }

  function setCoverLetter(value: string): void {
    const textarea = container.querySelector("textarea");
    if (!textarea) throw new Error("Cover letter input not found");
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    if (!setter) throw new Error("Textarea value setter not found");
    setter.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  it("rejects invalid input client-side without calling the API", () => {
    render();

    React.act(() => setCoverLetter("x".repeat(8001)));
    React.act(() => submit());

    expect(container.querySelector('[role="alert"]')?.textContent).toBe("VALIDATION_FAILED");
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it("trims a valid cover letter before applying", async () => {
    const onApplied = render();
    mockApiCall.mockResolvedValue(undefined);

    React.act(() => setCoverLetter("  A short introduction  "));
    await React.act(async () => submit());

    expect(mockApiCall).toHaveBeenCalledWith("/jobs/job-1/apply", {
      method: "POST",
      token: "token",
      body: { coverLetter: "A short introduction" },
    });
    expect(onApplied).toHaveBeenCalledTimes(1);
  });
});
