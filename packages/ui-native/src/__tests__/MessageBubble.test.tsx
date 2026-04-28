import { render } from "@testing-library/react-native";

import { MessageBubble, type MessageBubbleLabels } from "../MessageBubble";

const labels: MessageBubbleLabels = {
  ownPrefix: (time) => `You at ${time}`,
  otherPrefix: (name, time) => `${name} at ${time}`,
  failedHint: "Tap to retry",
  statusSending: "Sending",
  statusSent: "Sent",
  statusDelivered: "Delivered",
  statusRead: "Read",
  statusFailed: "Failed",
};

describe("MessageBubble", () => {
  it("matches the own-message snapshot", () => {
    const screen = render(
      <MessageBubble side="mine" timestamp="10:30" status="read" labels={labels}>
        مرحبًا
      </MessageBubble>,
    );

    expect(screen.toJSON()).toMatchSnapshot();
  });
});
