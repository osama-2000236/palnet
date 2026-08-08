import { fireEvent, render, screen } from "@testing-library/react-native";

import { BlockButton, BlockedListItem, ReportSheet } from "../safety";

const reasons = {
  SPAM: "Spam",
  HARASSMENT: "Harassment",
  HATE: "Hate",
  MISINFORMATION: "Misinformation",
  NUDITY: "Nudity",
  VIOLENCE: "Violence",
  FEE_REQUEST: "Asked me for money",
  GHOST_JOB: "The job does not exist",
  ID_REQUEST: "Asked for my ID",
  OTHER: "Other",
};

const blockLabels = {
  block: "Block",
  unblock: "Unblock",
  confirmTitle: "Confirm block",
  confirmBody: "This hides the member.",
  confirmCta: "Confirm",
  cancel: "Cancel",
};

const reportLabels = {
  title: "Report content",
  detailsLabel: "Details",
  cancel: "Cancel",
  submit: "Submit",
  close: "Close",
  reasons,
};

describe("safety primitives", () => {
  it("renders ReportSheet content", () => {
    const rendered = render(
      <ReportSheet
        open
        onOpenChange={jest.fn()}
        target={{ kind: "post", id: "post_1" }}
        onSubmit={jest.fn()}
        labels={reportLabels}
      />,
    );

    expect(rendered.toJSON()).toMatchSnapshot();
    expect(rendered.getByText("Report content")).toBeTruthy();
  });

  it("renders BlockButton resting state", () => {
    const rendered = render(
      <BlockButton userId="user_1" isBlocked={false} onChange={jest.fn()} labels={blockLabels} />,
    );

    expect(rendered.toJSON()).toMatchSnapshot();
  });

  it("renders BlockedListItem identity", () => {
    const rendered = render(
      <BlockedListItem
        item={{
          id: "block_1",
          blockedUserId: "user_1",
          blockedHandle: "blocked-user",
          blockedDisplayName: "Blocked User",
          blockedAvatarUrl: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        }}
        labels={{ unblock: "Unblock" }}
        onUnblock={jest.fn()}
      />,
    );

    expect(rendered.toJSON()).toMatchSnapshot();
    expect(rendered.getByText("Blocked User")).toBeTruthy();
  });

  it("confirms a block change and closes the confirmation", () => {
    const onChange = jest.fn();

    render(
      <BlockButton userId="user_1" isBlocked={false} onChange={onChange} labels={blockLabels} />,
    );

    fireEvent.press(screen.getByText("Block"));
    expect(screen.getByText("Confirm block")).toBeTruthy();

    fireEvent.press(screen.getByText("Confirm"));

    expect(onChange).toHaveBeenCalledWith(true, "user_1");
    expect(screen.queryByText("Confirm block")).toBeNull();
  });

  it("cancels a block confirmation without changing state", () => {
    const onChange = jest.fn();

    render(
      <BlockButton userId="user_1" isBlocked={false} onChange={onChange} labels={blockLabels} />,
    );

    fireEvent.press(screen.getByText("Block"));
    fireEvent.press(screen.getByText("Cancel"));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText("Confirm block")).toBeNull();
  });

  it("shows the unblock variant when initially blocked", () => {
    render(<BlockButton userId="user_1" isBlocked onChange={jest.fn()} labels={blockLabels} />);

    expect(screen.getByText("Unblock")).toBeTruthy();
    expect(screen.queryByText("Block")).toBeNull();
  });

  it("submits the selected report reason and trimmed details", () => {
    const onSubmit = jest.fn();
    const target = { kind: "post" as const, id: "post_1" };

    render(
      <ReportSheet
        open
        onOpenChange={jest.fn()}
        target={target}
        onSubmit={onSubmit}
        labels={reportLabels}
      />,
    );

    fireEvent.press(screen.getByLabelText("Harassment"));
    fireEvent.changeText(screen.getByLabelText("Details"), "  abusive reply  ");
    fireEvent.press(screen.getByText("Submit"));

    expect(onSubmit).toHaveBeenCalledWith({
      target,
      reason: "HARASSMENT",
      details: "abusive reply",
    });
  });

  // The never-pay banner opens this sheet already knowing what is being
  // reported, so the user never hunts for the right radio.
  it("preselects the reason it was opened with", () => {
    const onSubmit = jest.fn();
    const target = { kind: "user" as const, id: "user_1" };

    render(
      <ReportSheet
        open
        onOpenChange={jest.fn()}
        target={target}
        onSubmit={onSubmit}
        labels={reportLabels}
        initialReason="FEE_REQUEST"
      />,
    );

    fireEvent.press(screen.getByText("Submit"));

    expect(onSubmit).toHaveBeenCalledWith({ target, reason: "FEE_REQUEST", details: undefined });
  });

  // A sheet kept mounted with `open={false}` would otherwise reopen holding the
  // previous reason and the previous details text.
  it("resets reason and details when reopened", () => {
    const onSubmit = jest.fn();
    const target = { kind: "user" as const, id: "user_1" };
    const props = {
      onOpenChange: jest.fn(),
      target,
      onSubmit,
      labels: reportLabels,
      initialReason: "FEE_REQUEST" as const,
    };

    const rendered = render(<ReportSheet {...props} open />);
    fireEvent.press(screen.getByLabelText("Harassment"));
    fireEvent.changeText(screen.getByLabelText("Details"), "stale text");

    rendered.rerender(<ReportSheet {...props} open={false} />);
    rendered.rerender(<ReportSheet {...props} open />);

    fireEvent.press(screen.getByText("Submit"));

    expect(onSubmit).toHaveBeenCalledWith({ target, reason: "FEE_REQUEST", details: undefined });
  });

  it("cancels a report without submitting", () => {
    const onOpenChange = jest.fn();
    const onSubmit = jest.fn();

    render(
      <ReportSheet
        open
        onOpenChange={onOpenChange}
        target={{ kind: "post", id: "post_1" }}
        onSubmit={onSubmit}
        labels={reportLabels}
      />,
    );

    fireEvent.press(screen.getByText("Cancel"));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("sets initial focus intent inside the report sheet", () => {
    render(
      <ReportSheet
        open
        onOpenChange={jest.fn()}
        target={{ kind: "post", id: "post_1" }}
        onSubmit={jest.fn()}
        labels={reportLabels}
      />,
    );

    expect(screen.getByLabelText("Details").props.autoFocus).toBe(true);
  });
});
