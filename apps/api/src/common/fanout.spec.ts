import { EventEmitter } from "node:events";

import { LocalFanout, RedisFanout } from "./fanout";

interface FakeRedis extends EventEmitter {
  publish: jest.Mock;
  subscribe: jest.Mock;
  unsubscribe: jest.Mock;
}

function fakeRedis(): FakeRedis {
  const r = new EventEmitter() as FakeRedis;
  r.publish = jest.fn().mockResolvedValue(1);
  r.subscribe = jest.fn().mockResolvedValue(undefined);
  r.unsubscribe = jest.fn().mockResolvedValue(undefined);
  return r;
}

describe("LocalFanout", () => {
  it("delivers events to subscribers of the same user only, until unsubscribed", () => {
    const fanout = new LocalFanout<string>();
    const seenA: string[] = [];
    const seenB: string[] = [];
    const offA = fanout.subscribe("user-a", (e) => seenA.push(e));
    fanout.subscribe("user-b", (e) => seenB.push(e));

    fanout.publish("user-a", "hello");
    offA();
    fanout.publish("user-a", "after-unsubscribe");
    fanout.publish("user-b", "for-b");

    expect(seenA).toEqual(["hello"]);
    expect(seenB).toEqual(["for-b"]);
  });
});

describe("RedisFanout", () => {
  it("publishes JSON to the prefixed channel", () => {
    const pub = fakeRedis();
    const sub = fakeRedis();
    const fanout = new RedisFanout<{ n: number }>("chat", pub as never, sub as never);

    fanout.publish("user-1", { n: 7 });

    expect(pub.publish).toHaveBeenCalledWith("chat:user-1", JSON.stringify({ n: 7 }));
  });

  it("routes incoming Redis messages to local subscribers and refcounts channel subscriptions", () => {
    const pub = fakeRedis();
    const sub = fakeRedis();
    const fanout = new RedisFanout<{ n: number }>("chat", pub as never, sub as never);
    const seen: Array<{ n: number }> = [];

    const off1 = fanout.subscribe("user-1", (e) => seen.push(e));
    const off2 = fanout.subscribe("user-1", (e) => seen.push(e));
    expect(sub.subscribe).toHaveBeenCalledTimes(1);

    sub.emit("message", "chat:user-1", JSON.stringify({ n: 1 }));
    expect(seen).toEqual([{ n: 1 }, { n: 1 }]);

    off1();
    expect(sub.unsubscribe).not.toHaveBeenCalled();
    off2();
    expect(sub.unsubscribe).toHaveBeenCalledWith("chat:user-1");
  });

  it("ignores channels of other prefixes and malformed payloads", () => {
    const pub = fakeRedis();
    const sub = fakeRedis();
    const fanout = new RedisFanout<{ n: number }>("chat", pub as never, sub as never);
    const seen: Array<{ n: number }> = [];
    fanout.subscribe("user-1", (e) => seen.push(e));

    sub.emit("message", "notif:user-1", JSON.stringify({ n: 9 }));
    sub.emit("message", "chat:user-1", "{not json");

    expect(seen).toEqual([]);
  });
});
