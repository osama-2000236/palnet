import { MediaKind } from "@baydar/shared";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";

import { MediaScanService } from "./media-scan.service";

function makeConfig(env: Record<string, string | undefined>): ConfigService {
  return {
    get: (k: string) => env[k],
  } as unknown as ConfigService;
}

const request = {
  key: "post_media/u_1/photo.png",
  publicUrl: "https://cdn.example.com/post_media/u_1/photo.png",
  kind: MediaKind.IMAGE,
  mimeType: "image/png",
};

describe("MediaScanService", () => {
  const fetchSpy = jest.spyOn(globalThis, "fetch");

  afterEach(() => {
    fetchSpy.mockReset();
  });

  afterAll(() => {
    fetchSpy.mockRestore();
  });

  it("returns SKIPPED when scanners are not configured", async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [MediaScanService, { provide: ConfigService, useValue: makeConfig({}) }],
    }).compile();
    const svc = moduleRef.get(MediaScanService);

    await expect(svc.scanObject(request)).resolves.toMatchObject({
      status: "SKIPPED",
      reasons: [],
      scanners: {
        clamav: { status: "skipped" },
        cloudflareImages: { status: "skipped" },
      },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("blocks when ClamAV reports a virus", async () => {
    fetchSpy.mockResolvedValueOnce(response({ clean: false, virus: "EICAR-Test-File" }));
    fetchSpy.mockResolvedValueOnce(response({ tags: [] }));
    const moduleRef = await Test.createTestingModule({
      providers: [
        MediaScanService,
        {
          provide: ConfigService,
          useValue: makeConfig({
            CLAMAV_SCAN_URL: "https://scan.example.com/clamav",
            CLOUDFLARE_IMAGES_SCAN_URL: "https://scan.example.com/cloudflare",
          }),
        },
      ],
    }).compile();
    const svc = moduleRef.get(MediaScanService);

    await expect(svc.scanObject(request)).resolves.toMatchObject({
      status: "BLOCKED",
      reasons: ["EICAR-Test-File"],
    });
  });

  it("blocks images with unsafe Cloudflare classification tags", async () => {
    fetchSpy.mockResolvedValueOnce(response({ clean: true }));
    fetchSpy.mockResolvedValueOnce(response({ tags: ["nudity"] }));
    const moduleRef = await Test.createTestingModule({
      providers: [
        MediaScanService,
        {
          provide: ConfigService,
          useValue: makeConfig({
            CLAMAV_SCAN_URL: "https://scan.example.com/clamav",
            CLOUDFLARE_IMAGES_SCAN_URL: "https://scan.example.com/cloudflare",
          }),
        },
      ],
    }).compile();
    const svc = moduleRef.get(MediaScanService);

    await expect(svc.scanObject(request)).resolves.toMatchObject({
      status: "BLOCKED",
      reasons: ["ADULT_OR_UNSAFE_IMAGE"],
    });
  });
});

function response(body: Record<string, unknown>): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}
