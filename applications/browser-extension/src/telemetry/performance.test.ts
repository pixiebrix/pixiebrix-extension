import { initPerformanceMonitoring } from "./performance";
import { getDNT } from "./dnt";
import { flagOn } from "@/auth/featureFlagStorage";
import { getBaseURL } from "@/data/service/baseService";
import { datadogRum } from "@datadog/browser-rum";
import { readAuthData } from "@/auth/authStorage";

jest.mock("./dnt");
jest.mock("../auth/featureFlagStorage");
jest.mock("../data/service/baseService");
jest.mock("../auth/authStorage");
jest.mock("@datadog/browser-rum");

// Disable the automock for telemetryHelpers
jest.mock("./telemetryHelpers", () =>
  jest.requireActual("./telemetryHelpers.ts"),
);

describe("initPerformanceMonitoring", () => {
  it("should not initialize if DNT is enabled", async () => {
    jest.mocked(getDNT).mockResolvedValue(true);

    await initPerformanceMonitoring();

    expect(datadogRum.init).not.toHaveBeenCalled();
  });

  it("should not initialize if RUM flag is off", async () => {
    jest.mocked(getDNT).mockResolvedValue(false);
    jest.mocked(flagOn).mockResolvedValue(false);

    await initPerformanceMonitoring();

    expect(datadogRum.init).not.toHaveBeenCalled();
  });

  it("should not initialize if application ID or client token is not configured", async () => {
    jest.mocked(getDNT).mockResolvedValue(false);
    jest.mocked(flagOn).mockResolvedValue(true);
    process.env.DATADOG_APPLICATION_ID = "";
    process.env.DATADOG_CLIENT_TOKEN = "";

    await initPerformanceMonitoring();

    expect(datadogRum.init).not.toHaveBeenCalled();
  });

  describe("given the required initialization conditions", () => {
    beforeEach(() => {
      jest.mocked(getDNT).mockResolvedValue(false);
      jest.mocked(flagOn).mockResolvedValue(true);
      process.env.DATADOG_APPLICATION_ID = "applicationId";
      process.env.DATADOG_CLIENT_TOKEN = "clientToken";
      process.env.ENVIRONMENT = "local";
      jest.mocked(getBaseURL).mockResolvedValue("https://example.com");
      browser.runtime.getManifest = jest
        .fn()
        .mockReturnValue({ version_name: "1.8.8-alpha+293128" });
      jest.mocked(readAuthData).mockResolvedValue({
        user: "634b1b49-4382-4292-87f4-d25c6a1db3d7",
        organizationId: "24a7c934-a531-49d8-a15d-cdf0baa54146",
      } as any);
    });

    it("should initialize performance monitoring", async () => {
      await initPerformanceMonitoring({
        additionalGlobalContext: { connectedTabUrl: "google.com" },
      });

      expect(datadogRum.init).toHaveBeenCalledWith({
        applicationId: "applicationId",
        clientToken: "clientToken",
        site: "datadoghq.com",
        service: "pixiebrix-browser-extension",
        env: "local",
        version: expect.any(String),
        sessionSampleRate: 100,
        sessionReplaySampleRate: 20,
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: "mask",
        allowedTracingUrls: ["https://example.com"],
        allowFallbackToLocalStorage: true,
      });
      expect(datadogRum.setGlobalContext).toHaveBeenCalledWith({
        code_version: process.env.SOURCE_VERSION,
        connectedTabUrl: "google.com",
      });
      expect(datadogRum.setUser).toHaveBeenCalledWith({
        email: undefined,
        id: "634b1b49-4382-4292-87f4-d25c6a1db3d7",
        organizationId: "24a7c934-a531-49d8-a15d-cdf0baa54146",
      });
    });

    it("should force session replay recording when sessionSampleRate is set to 100", async () => {
      await initPerformanceMonitoring({ sessionReplaySampleRate: 100 });

      expect(datadogRum.init).toHaveBeenCalledWith({
        applicationId: "applicationId",
        clientToken: "clientToken",
        site: "datadoghq.com",
        service: "pixiebrix-browser-extension",
        env: "local",
        version: expect.any(String),
        sessionSampleRate: 100,
        sessionReplaySampleRate: 100,
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: "mask",
        allowedTracingUrls: ["https://example.com"],
        allowFallbackToLocalStorage: true,
      });
      expect(datadogRum.setGlobalContext).toHaveBeenCalledWith({
        code_version: process.env.SOURCE_VERSION,
      });
      expect(datadogRum.setUser).toHaveBeenCalledWith({
        email: undefined,
        id: "634b1b49-4382-4292-87f4-d25c6a1db3d7",
        organizationId: "24a7c934-a531-49d8-a15d-cdf0baa54146",
      });
      expect(datadogRum.startSessionReplayRecording).toHaveBeenCalledWith({
        force: true,
      });
    });
  });
});
