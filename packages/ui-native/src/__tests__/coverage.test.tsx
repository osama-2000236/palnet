import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text, View } from "react-native";

import { AppHeader } from "../AppHeader";
import { Banner } from "../Banner";
import { ComposerEntry } from "../ComposerEntry";
import { Dialog } from "../Dialog";
import { EmptyState } from "../EmptyState";
import { OnboardingProgress } from "../OnboardingProgress";
import { RecordCard } from "../RecordCard";
import { RecordCardSkeleton } from "../RecordCardSkeleton";
import { RetryChip } from "../RetryChip";
import { BlockButton, BlockedListItem, ReportSheet } from "../safety";
import { SearchField } from "../SearchField";
import { Tab, Tabs } from "../Tabs";
import { StateMessage } from "../StateMessage";
import { Switch } from "../Switch";

const user = {
  id: "u1",
  handle: "layan",
  firstName: "ليان",
  lastName: "الخطيب",
};

const blockLabels = {
  block: "Block",
  unblock: "Unblock",
  confirmTitle: "Confirm",
  confirmBody: "Are you sure?",
  confirmCta: "Confirm block",
  cancel: "Cancel",
};

const reportLabels = {
  title: "Report",
  detailsLabel: "Details",
  cancel: "Cancel",
  submit: "Submit",
  close: "Close",
  reasons: {
    SPAM: "Spam",
    HARASSMENT: "Harassment",
    HATE: "Hate",
    MISINFORMATION: "Misinformation",
    NUDITY: "Nudity",
    VIOLENCE: "Violence",
    OTHER: "Other",
  },
};

describe("native exported component coverage", () => {
  it("renders display primitives and skeletons", () => {
    render(
      <View>
        <AppHeader title="Feed" subtitle="Latest posts" trailing={<Text>Action</Text>} />
        <Banner kind="info">Network restored</Banner>
        <Dialog open title="Dialog title" onClose={jest.fn()}>
          <Text>Dialog body</Text>
        </Dialog>
        <EmptyState motif="search" title="No results" body="Try another search" />
        <OnboardingProgress current={2} total={4} labels={["One", "Two", "Three", "Four"]} />
        <RecordCard title="Record title" subtitle="Record subtitle" meta="2026" metaDirection="ltr">
          <Text>Record child</Text>
        </RecordCard>
        <RecordCardSkeleton testID="record-skeleton" />
        <StateMessage
          title="Offline"
          message="Reconnect and try again"
          tone="offline"
          icon="clock"
        />
      </View>,
    );

    expect(screen.getByText("Feed")).toBeTruthy();
    expect(screen.getByText("Network restored")).toBeTruthy();
    expect(screen.getByText("Dialog body")).toBeTruthy();
    expect(screen.getByText("No results")).toBeTruthy();
    expect(screen.getByText("Two")).toBeTruthy();
    expect(screen.getByText("Record child")).toBeTruthy();
    expect(screen.getByText("Reconnect and try again")).toBeTruthy();
  });

  it("fires callbacks for native input and action primitives", () => {
    const onPress = jest.fn();
    const onChange = jest.fn();
    const onClear = jest.fn();
    const onDismiss = jest.fn();

    render(
      <View>
        <Banner kind="success" dismissible onDismiss={onDismiss} dismissLabel="Dismiss banner">
          Saved
        </Banner>
        <ComposerEntry user={user} placeholder="Start a post" onPress={onPress} />
        <RetryChip label="Retry" onRetry={onPress} />
        <SearchField
          value="query"
          onChangeText={onChange}
          onClear={onClear}
          clearLabel="Clear search"
          accessibilityLabel="Search"
        />
        <Tabs value="all" onChange={onChange}>
          <Tab value="all">All</Tab>
          <Tab value="saved">Saved</Tab>
        </Tabs>
        <Switch checked={false} ariaLabel="Enable notifications" onChange={onChange} />
        <StateMessage message="Try again" actionLabel="Reload" onAction={onPress} />
      </View>,
    );

    fireEvent.press(screen.getByLabelText("Dismiss banner"));
    fireEvent.press(screen.getByLabelText("Start a post"));
    fireEvent.press(screen.getByText("Retry"));
    fireEvent.changeText(screen.getByLabelText("Search"), "next");
    fireEvent.press(screen.getByLabelText("Clear search"));
    fireEvent.press(screen.getByLabelText("Saved"));
    fireEvent.press(screen.getByLabelText("Enable notifications"));
    fireEvent.press(screen.getByText("Reload"));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenCalledWith("next");
    expect(onChange).toHaveBeenCalledWith("saved");
    expect(onChange).toHaveBeenCalledWith(true);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("covers native safety controls", () => {
    const onBlockChange = jest.fn();
    const onOpenChange = jest.fn();
    const onSubmit = jest.fn();
    const onUnblock = jest.fn();

    render(
      <View>
        <BlockButton userId="u2" isBlocked={false} labels={blockLabels} onChange={onBlockChange} />
        <BlockedListItem
          item={{
            id: "b1",
            blockedUserId: "u2",
            blockedHandle: "samir",
            blockedDisplayName: "Samir",
            blockedAvatarUrl: null,
            createdAt: new Date().toISOString(),
          }}
          labels={{ unblock: "Unblock" }}
          onUnblock={onUnblock}
        />
        <ReportSheet
          open
          target={{ kind: "post", id: "p1" }}
          labels={reportLabels}
          onOpenChange={onOpenChange}
          onSubmit={onSubmit}
        />
      </View>,
    );

    fireEvent.press(screen.getByText("Block"));
    fireEvent.press(screen.getByText("Confirm block"));
    fireEvent.press(screen.getAllByText("Unblock")[0]);
    fireEvent.press(screen.getByText("Harassment"));
    fireEvent.changeText(screen.getByLabelText("Details"), "Bad behavior");
    fireEvent.press(screen.getByText("Submit"));

    expect(onBlockChange).toHaveBeenCalledWith(true, "u2");
    expect(onUnblock).toHaveBeenCalledWith("u2");
    expect(onSubmit).toHaveBeenCalledWith({
      target: { kind: "post", id: "p1" },
      reason: "HARASSMENT",
      details: "Bad behavior",
    });
  });
});
