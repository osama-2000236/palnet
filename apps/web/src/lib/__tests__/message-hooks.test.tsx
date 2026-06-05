import type { ChatRoom, Message } from "@baydar/shared";
import React from "react";
import { createRoot, type Root } from "react-dom/client";

import type { UseRoomMessagesResult } from "../../app/[locale]/(app)/messages/_hooks/useRoomMessages";
import { useRoomMessages } from "../../app/[locale]/(app)/messages/_hooks/useRoomMessages";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const mockApiCall = jest.fn();
const mockApiFetch = jest.fn();
const mockApiFetchPage = jest.fn();
const mockOpenStream = jest.fn();

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values?.count ? `${key}:${values.count}` : key,
}));

jest.mock("@/lib/api", () => ({
  ApiRequestError: class ApiRequestError extends Error {
    constructor(
      public readonly status: number,
      public readonly code: string,
    ) {
      super(`API ${status} ${code}`);
    }
  },
  apiCall: (...args: unknown[]) => mockApiCall(...args),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiFetchPage: (...args: unknown[]) => mockApiFetchPage(...args),
}));

jest.mock("@/lib/sse", () => ({
  openStream: (...args: unknown[]) => mockOpenStream(...args),
}));

const viewerId = "cm00000000000000000000001";
const otherOneId = "cm00000000000000000000002";
const otherTwoId = "cm00000000000000000000003";
const roomOneId = "cm00000000000000000000101";
const roomTwoId = "cm00000000000000000000102";
const messageOneId = "cm00000000000000000000201";
const messageSavedId = "cm00000000000000000000202";

const roomOne: ChatRoom = {
  id: roomOneId,
  isGroup: false,
  title: null,
  lastMessage: null,
  unreadCount: 0,
  updatedAt: "2026-06-01T10:00:00.000Z",
  members: [
    {
      userId: viewerId,
      handle: "viewer",
      firstName: "Viewer",
      lastName: "User",
      avatarUrl: null,
      lastReadAt: "2026-06-01T10:00:00.000Z",
      lastSeenAt: null,
    },
    {
      userId: otherOneId,
      handle: "other-one",
      firstName: "Other",
      lastName: "One",
      avatarUrl: null,
      lastReadAt: null,
      lastSeenAt: "2026-06-01T10:01:00.000Z",
    },
  ],
};

const roomTwo: ChatRoom = {
  ...roomOne,
  id: roomTwoId,
  members: [
    roomOne.members[0]!,
    {
      ...roomOne.members[1]!,
      userId: otherTwoId,
      handle: "other-two",
      firstName: "Other",
      lastName: "Two",
    },
  ],
};

function makeMessage(partial: Partial<Message> = {}): Message {
  return {
    id: messageOneId,
    roomId: roomTwo.id,
    authorId: otherTwoId,
    body: "Hello",
    mediaUrl: null,
    clientMessageId: null,
    createdAt: "2026-06-01T10:02:00.000Z",
    editedAt: null,
    deletedAt: null,
    ...partial,
  };
}

async function flushEffects(): Promise<void> {
  await React.act(async () => {
    await Promise.resolve();
  });
}

describe("useRoomMessages", () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: UseRoomMessagesResult | null;
  let stream: {
    close: jest.Mock;
    onmessage: ((event: MessageEvent) => void) | null;
    onerror: (() => void) | null;
  };

  beforeEach(() => {
    latest = null;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    stream = { close: jest.fn(), onmessage: null, onerror: null };
    mockApiCall.mockReset();
    mockApiFetch.mockReset();
    mockApiFetchPage.mockReset();
    mockOpenStream.mockReset();
    mockOpenStream.mockResolvedValue(stream);
    mockApiCall.mockResolvedValue(undefined);
    mockApiFetchPage.mockImplementation((path: string) => {
      if (path === "/messaging/rooms") {
        return Promise.resolve({ data: [roomOne, roomTwo] });
      }
      if (path.startsWith(`/messaging/rooms/${roomTwo.id}/messages`)) {
        return Promise.resolve({
          data: [],
          meta: { nextCursor: null, hasMore: false },
        });
      }
      return Promise.resolve({
        data: [],
        meta: { nextCursor: null, hasMore: false },
      });
    });
    window.history.replaceState(null, "", `/messages?roomId=${roomTwo.id}`);
    window.requestAnimationFrame = (callback: FrameRequestCallback): number =>
      window.setTimeout(() => callback(Date.now()), 0);
  });

  afterEach(() => {
    React.act(() => root.unmount());
    container.remove();
  });

  function Probe(): null {
    latest = useRoomMessages({ token: "access-token", viewerId });
    return null;
  }

  async function renderProbe(): Promise<UseRoomMessagesResult> {
    React.act(() => {
      root.render(<Probe />);
    });
    for (let i = 0; i < 5; i += 1) {
      await flushEffects();
    }
    if (!latest) throw new Error("Hook did not render");
    return latest;
  }

  it("loads the requested room and applies incoming realtime messages", async () => {
    const hook = await renderProbe();

    expect(hook.activeRoomId).toBe(roomTwo.id);
    expect(mockApiFetchPage).toHaveBeenCalledWith("/messaging/rooms", expect.anything(), {
      token: "access-token",
    });
    expect(mockApiFetchPage).toHaveBeenCalledWith(
      `/messaging/rooms/${roomTwo.id}/messages?limit=30`,
      expect.anything(),
      { token: "access-token" },
    );

    const incoming = makeMessage();
    React.act(() => {
      stream.onmessage?.({
        data: JSON.stringify({ type: "message.new", payload: incoming }),
      } as MessageEvent);
    });

    expect(latest?.messages).toEqual([incoming]);
    expect(latest?.rooms.find((room) => room.id === roomTwo.id)?.lastMessage).toEqual(incoming);
    expect(mockApiCall).toHaveBeenCalledWith(`/messaging/rooms/${roomTwo.id}/read`, {
      method: "POST",
      token: "access-token",
    });
  });

  it("marks failed optimistic sends and retries with the same clientMessageId", async () => {
    await renderProbe();
    mockApiFetch.mockRejectedValueOnce(new Error("network"));

    React.act(() => {
      latest?.setDraft("Retry me");
    });
    await React.act(async () => {
      await latest?.submit();
    });

    const failed = latest?.messages[0];
    expect(failed?.body).toBe("Retry me");
    expect(failed?.clientMessageId).toEqual(expect.any(String));
    expect(latest?.failedClientIds.has(failed?.clientMessageId ?? "")).toBe(true);

    const saved = makeMessage({
      id: messageSavedId,
      authorId: viewerId,
      body: "Retry me",
      clientMessageId: failed?.clientMessageId ?? null,
    });
    mockApiFetch.mockResolvedValueOnce(saved);

    await React.act(async () => {
      await latest?.retryFailed(failed?.clientMessageId ?? "");
    });

    expect(latest?.messages[0]).toEqual(saved);
    expect(latest?.failedClientIds.has(saved.clientMessageId ?? "")).toBe(false);
    expect(mockApiFetch).toHaveBeenLastCalledWith(
      `/messaging/rooms/${roomTwo.id}/messages`,
      expect.anything(),
      {
        method: "POST",
        token: "access-token",
        body: { body: "Retry me", clientMessageId: saved.clientMessageId },
      },
    );
  });
});
