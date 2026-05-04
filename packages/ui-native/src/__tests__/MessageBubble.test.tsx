import { render } from "@testing-library/react-native";

import { MessageBubble, type MessageBubbleLabels, type MessageStatus } from "../MessageBubble";

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

const arabicLabels: MessageBubbleLabels = {
  ownPrefix: (time) => `أنت في ${time}`,
  otherPrefix: (name, time) => `${name} في ${time}`,
  failedHint: "اضغط لإعادة المحاولة",
  statusSending: "جار الإرسال",
  statusSent: "تم الإرسال",
  statusDelivered: "تم التسليم",
  statusRead: "تمت القراءة",
  statusFailed: "فشل الإرسال",
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

  it("matches the theirs-message snapshot", () => {
    const screen = render(
      <MessageBubble
        side="theirs"
        timestamp="10:45"
        authorName="ليلى"
        groupAuthor={{ id: "u2", handle: "layla", firstName: "ليلى", lastName: "ناصر" }}
        labels={arabicLabels}
      >
        أهلًا وسهلًا
      </MessageBubble>,
    );

    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("renders each mine status label", () => {
    const cases: Array<[MessageStatus, string]> = [
      ["sending", arabicLabels.statusSending],
      ["sent", arabicLabels.statusSent],
      ["delivered", arabicLabels.statusDelivered],
      ["read", arabicLabels.statusRead],
      ["failed", arabicLabels.statusFailed],
    ];

    for (const [status, label] of cases) {
      const screen = render(
        <MessageBubble side="mine" timestamp="10:50" status={status} labels={arabicLabels}>
          تم
        </MessageBubble>,
      );

      expect(screen.getByLabelText(label)).toBeTruthy();
      screen.unmount();
    }
  });

  it("renders failed retry hint text", () => {
    const screen = render(
      <MessageBubble side="mine" timestamp="10:51" status="failed" labels={arabicLabels}>
        لم يصل النص
      </MessageBubble>,
    );

    expect(screen.getByText(arabicLabels.failedHint)).toBeTruthy();
  });

  it("renders group sender for theirs and omits it for mine", () => {
    const groupAuthor = { id: "u2", handle: "layla", firstName: "ليلى", lastName: "ناصر" };
    const theirs = render(
      <MessageBubble
        side="theirs"
        timestamp="10:52"
        authorName="ليلى"
        groupAuthor={groupAuthor}
        labels={arabicLabels}
      >
        رسالة من ليلى
      </MessageBubble>,
    );

    expect(theirs.getByText("ليلى")).toBeTruthy();
    theirs.unmount();

    const mine = render(
      <MessageBubble
        side="mine"
        timestamp="10:53"
        authorName="ليلى"
        groupAuthor={groupAuthor}
        labels={arabicLabels}
      >
        ردي على ليلى
      </MessageBubble>,
    );

    expect(mine.queryByText("ليلى")).toBeNull();
  });
});
