import { ErrorCode, MediaKind } from "@baydar/shared";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(async () => "https://signed.example/put"),
}));

import type { DomainException } from "../../common/domain-exception";

import { MediaService } from "./media.service";

function makeConfig(env: Record<string, string | undefined>): ConfigService {
  return {
    get: (k: string) => env[k],
  } as unknown as ConfigService;
}

const FULL_ENV = {
  R2_ACCOUNT_ID: "acc",
  R2_ACCESS_KEY_ID: "ak",
  R2_SECRET_ACCESS_KEY: "sk",
  R2_BUCKET: "baydar-media",
  R2_PUBLIC_URL: "https://cdn.example.com",
};

describe("MediaService", () => {
  it("throws INTERNAL (503) when R2 env is missing", async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [MediaService, { provide: ConfigService, useValue: makeConfig({}) }],
    }).compile();
    const svc = moduleRef.get(MediaService);

    await expect(
      svc.presign("u_1", {
        purpose: "AVATAR",
        kind: MediaKind.IMAGE,
        mimeType: "image/png",
        sizeBytes: 1024,
      }),
    ).rejects.toMatchObject({
      status: 503,
      code: ErrorCode.INTERNAL,
    } as Partial<DomainException>);
  });

  it("rejects a kind not allowed for the purpose", async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [MediaService, { provide: ConfigService, useValue: makeConfig(FULL_ENV) }],
    }).compile();
    const svc = moduleRef.get(MediaService);

    await expect(
      svc.presign("u_1", {
        purpose: "AVATAR",
        kind: MediaKind.VIDEO,
        mimeType: "video/mp4",
        sizeBytes: 1024,
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.MEDIA_TYPE_REJECTED,
    });
  });

  it("rejects MIME types outside the allowlist", async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [MediaService, { provide: ConfigService, useValue: makeConfig(FULL_ENV) }],
    }).compile();
    const svc = moduleRef.get(MediaService);

    await expect(
      svc.presign("u_1", {
        purpose: "POST_MEDIA",
        kind: MediaKind.VIDEO,
        mimeType: "video/webm",
        sizeBytes: 1024,
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.MEDIA_TYPE_REJECTED,
    });
  });

  it("rejects files over the MIME family size cap", async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [MediaService, { provide: ConfigService, useValue: makeConfig(FULL_ENV) }],
    }).compile();
    const svc = moduleRef.get(MediaService);

    await expect(
      svc.presign("u_1", {
        purpose: "AVATAR",
        kind: MediaKind.IMAGE,
        mimeType: "image/png",
        sizeBytes: 11 * 1024 * 1024,
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.MEDIA_SIZE_REJECTED,
    });
  });

  it("allows PDFs up to 25MB for post media", async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [MediaService, { provide: ConfigService, useValue: makeConfig(FULL_ENV) }],
    }).compile();
    const svc = moduleRef.get(MediaService);

    const out = await svc.presign("u_1", {
      purpose: "POST_MEDIA",
      kind: MediaKind.DOCUMENT,
      mimeType: "application/pdf",
      sizeBytes: 25 * 1024 * 1024,
      filename: "resume.pdf",
    });

    expect(out.key).toMatch(/^post_media\/u_1\/[0-9a-f-]+\.pdf$/);
    expect(out.headers["Content-Type"]).toBe("application/pdf");
    expect(out.blurhash).toBeNull();
  });

  it("returns a signed upload URL + deterministic key + public URL on happy path", async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [MediaService, { provide: ConfigService, useValue: makeConfig(FULL_ENV) }],
    }).compile();
    const svc = moduleRef.get(MediaService);

    const out = await svc.presign("u_1", {
      purpose: "AVATAR",
      kind: MediaKind.IMAGE,
      mimeType: "image/png",
      sizeBytes: 500 * 1024,
      filename: "me.PNG",
    });

    expect(out.uploadUrl).toBe("https://signed.example/put");
    expect(out.key).toMatch(/^avatar\/u_1\/[0-9a-f-]+\.png$/);
    expect(out.publicUrl).toBe(`https://cdn.example.com/${out.key}`);
    expect(out.headers["Content-Type"]).toBe("image/png");
    expect(out.blurhash).toEqual(expect.any(String));
  });
});
