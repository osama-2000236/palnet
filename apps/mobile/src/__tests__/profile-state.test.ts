import { ApiRequestError } from "@/lib/api";
import { fetchProfileStatus, resolvePostAuthRoute } from "@/lib/profile-state";

const mockApiFetch = jest.fn();
const mockClearProfileCache = jest.fn();
const mockReadProfileCache = jest.fn();
const mockWriteProfileCache = jest.fn();

jest.mock("@/lib/api", () => ({
  ApiRequestError: class ApiRequestError extends Error {
    public readonly status: number;
    public readonly code: string;

    constructor(status: number, code: string) {
      super(code);
      this.status = status;
      this.code = code;
    }
  },
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

jest.mock("@/lib/session", () => ({
  clearProfileCache: () => mockClearProfileCache(),
  readProfileCache: (...args: unknown[]) => mockReadProfileCache(...args),
  writeProfileCache: (...args: unknown[]) => mockWriteProfileCache(...args),
}));

const session = {
  user: { id: "user-1", email: "demo@baydar.ps", role: "USER" as const, locale: "ar-PS" },
  tokens: {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    accessExpiresAt: new Date().toISOString(),
    refreshExpiresAt: new Date().toISOString(),
  },
};

const profile = {
  id: "profile-1",
  userId: "user-1",
  handle: "demo",
  firstName: "ليان",
  lastName: "خليل",
  headline: "Full Stack Engineer",
  location: "Ramallah",
  openToWork: false,
  hiring: false,
  experiences: [
    {
      id: "experience-1",
      title: "Full Stack Engineer",
      companyName: "Baydar",
      companyId: null,
      location: "Ramallah",
      locationMode: "HYBRID",
      startDate: new Date("2024-01-01T00:00:00.000Z").toISOString(),
      endDate: null,
      description: null,
    },
  ],
  educations: [],
  skills: [],
};

describe("profile-state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadProfileCache.mockResolvedValue(null);
  });

  it("requires onboarding when the API says the profile is missing", async () => {
    mockApiFetch.mockRejectedValue(new ApiRequestError(404, "NOT_FOUND"));

    await expect(fetchProfileStatus("access-token")).resolves.toEqual({
      status: "required",
      profile: null,
      source: "api",
    });
    expect(mockClearProfileCache).toHaveBeenCalled();
  });

  it("routes to feed when profile status is complete", async () => {
    mockApiFetch.mockResolvedValue(profile);

    await expect(resolvePostAuthRoute(session)).resolves.toBe("/(app)/feed");
    expect(mockWriteProfileCache).toHaveBeenCalledWith(profile);
  });

  it("requires onboarding when a profile exists but lacks background", async () => {
    mockApiFetch.mockResolvedValue({ ...profile, experiences: [], educations: [] });

    await expect(fetchProfileStatus("access-token")).resolves.toEqual({
      status: "required",
      profile: null,
      source: "api",
    });
    expect(mockClearProfileCache).toHaveBeenCalled();
    expect(mockWriteProfileCache).not.toHaveBeenCalled();
  });

  it("falls back to cached completion when profile verification is temporarily unavailable", async () => {
    mockApiFetch.mockRejectedValue(new Error("network down"));
    mockReadProfileCache.mockResolvedValue({
      userId: "user-1",
      handle: "demo",
      completedAt: new Date().toISOString(),
    });

    await expect(resolvePostAuthRoute(session)).resolves.toBe("/(app)/feed");
  });
});
