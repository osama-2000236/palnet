import {
  partRange,
  runResumableUpload,
  shouldUseMultipart,
  type ResumableUploadReceipt,
  type ResumableUploadTransport,
} from "./resumable-upload";
import { MULTIPART_PART_BYTES } from "./schemas/media";

const PLAN = {
  uploadId: "upload-1",
  key: "post_media/user-1/abc.mp4",
  publicUrl: "https://cdn.baydar.ps/post_media/user-1/abc.mp4",
  partBytes: MULTIPART_PART_BYTES,
  partCount: 4,
};

function transport(overrides: Partial<ResumableUploadTransport> = {}) {
  const sent: number[] = [];
  const signed: number[] = [];
  const base: ResumableUploadTransport = {
    start: () => Promise.resolve(PLAN),
    signPart: (_receipt, partNumber) => {
      signed.push(partNumber);
      return Promise.resolve(`https://r2.test/part/${partNumber}`);
    },
    putPart: (_url, partNumber) => {
      sent.push(partNumber);
      return Promise.resolve(`etag-${partNumber}`);
    },
    complete: (receipt) => Promise.resolve(receipt.publicUrl),
  };
  return { transport: { ...base, ...overrides }, sent, signed };
}

describe("when multipart is worth it", () => {
  it("takes the plain PUT for anything smaller than one part", () => {
    // Multipart costs three extra round trips, which is the wrong trade for a
    // small image on the very connection this exists to help.
    expect(shouldUseMultipart(1)).toBe(false);
    expect(shouldUseMultipart(MULTIPART_PART_BYTES - 1)).toBe(false);
    expect(shouldUseMultipart(MULTIPART_PART_BYTES)).toBe(true);
    expect(shouldUseMultipart(20 * 1024 * 1024)).toBe(true);
  });
});

describe("a clean upload", () => {
  it("sends every part in order and completes", async () => {
    const { transport: t, sent } = transport();

    const out = await runResumableUpload({ transport: t });

    // Sequential, not parallel: parallel parts share the same few kilobits and
    // every one finishes later than sending them in turn would have.
    expect(sent).toEqual([1, 2, 3, 4]);
    expect(out.publicUrl).toBe(PLAN.publicUrl);
    expect(out.receipt.etags).toEqual({
      1: "etag-1",
      2: "etag-2",
      3: "etag-3",
      4: "etag-4",
    });
  });

  it("signs each part immediately before sending it", async () => {
    // A signature lives five minutes and an upload on 2G does not. Signing the
    // set up front is the reason the last part fails.
    const order: string[] = [];
    const { transport: t } = transport({
      signPart: (_r, n) => {
        order.push(`sign-${n}`);
        return Promise.resolve("url");
      },
      putPart: (_u, n) => {
        order.push(`put-${n}`);
        return Promise.resolve(`etag-${n}`);
      },
    });

    await runResumableUpload({ transport: t });

    expect(order).toEqual([
      "sign-1",
      "put-1",
      "sign-2",
      "put-2",
      "sign-3",
      "put-3",
      "sign-4",
      "put-4",
    ]);
  });

  it("reports progress after each committed part", async () => {
    const seen: Array<[number, number]> = [];
    const { transport: t } = transport();

    await runResumableUpload({
      transport: t,
      onProgress: (_receipt, done, total) => seen.push([done, total]),
    });

    expect(seen).toEqual([
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 4],
    ]);
  });
});

describe("a drop mid-upload", () => {
  it("loses the part in flight and nothing else", async () => {
    let receipt: ResumableUploadReceipt | null = null;
    const { transport: failing } = transport({
      putPart: (_u, n) => {
        if (n === 3) return Promise.reject(new Error("socket closed"));
        return Promise.resolve(`etag-${n}`);
      },
    });

    await expect(
      runResumableUpload({
        transport: failing,
        onProgress: (r) => {
          receipt = { ...r, etags: { ...r.etags } };
        },
      }),
    ).rejects.toThrow("socket closed");

    // Two parts survived. That is the whole feature: nine minutes of upload
    // does not become zero because minute eight went wrong.
    expect(receipt).not.toBeNull();
    expect(receipt!.etags).toEqual({ 1: "etag-1", 2: "etag-2" });
  });

  it("resumes from the receipt instead of starting over", async () => {
    const { transport: t, sent } = transport();
    const resumeFrom: ResumableUploadReceipt = {
      ...PLAN,
      etags: { 1: "etag-1", 2: "etag-2" },
    };

    const out = await runResumableUpload({ transport: t, resumeFrom });

    expect(sent).toEqual([3, 4]);
    expect(out.receipt.etags[1]).toBe("etag-1");
  });

  it("does not begin a second upload when resuming", async () => {
    // A resume that called start() would orphan the first upload's parts and
    // bill for them until the abort sweep — and lose the ones already sent.
    const start = jest.fn();
    const { transport: t } = transport({ start });

    await runResumableUpload({
      transport: t,
      resumeFrom: { ...PLAN, etags: { 1: "e1", 2: "e2", 3: "e3", 4: "e4" } },
    });

    expect(start).not.toHaveBeenCalled();
  });
});

describe("part ranges", () => {
  it("covers the file exactly, with a short last part", () => {
    const size = MULTIPART_PART_BYTES * 3 + 1234;
    const ranges = [1, 2, 3, 4].map((n) => partRange(PLAN, n, size));

    expect(ranges[0]).toEqual({ start: 0, end: MULTIPART_PART_BYTES });
    expect(ranges[3]).toEqual({ start: MULTIPART_PART_BYTES * 3, end: size });
    // No gaps, no overlap — a byte counted twice is a corrupt file.
    for (let i = 1; i < ranges.length; i += 1) {
      expect(ranges[i]!.start).toBe(ranges[i - 1]!.end);
    }
  });

  it("never runs past the end of a file smaller than one part", () => {
    expect(partRange(PLAN, 1, 100)).toEqual({ start: 0, end: 100 });
  });
});
