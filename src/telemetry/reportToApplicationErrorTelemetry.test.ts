/*
 * Copyright (C) 2024 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { flagOn } from "@/auth/featureFlagStorage";
import { reportToApplicationErrorTelemetry } from "@/telemetry/reportToApplicationErrorTelemetry";
import { serializeError } from "serialize-error";
import { FeatureFlags, type FeatureFlag } from "@/auth/featureFlags";
import { sendErrorViaErrorReporter } from "@/offscreen/messenger/api";

jest.mock("@/auth/featureFlagStorage", () => ({
  flagOn: jest.fn().mockRejectedValue(new Error("Not mocked")),
}));

jest.mock("@/telemetry/telemetryHelpers", () => ({
  ...jest.requireActual("@/telemetry/telemetryHelpers"),
  mapAppUserToTelemetryUser: jest.fn().mockResolvedValue({}),
}));

jest.mock("@/offscreen/messenger/api");

const flagOnMock = jest.mocked(flagOn);
const mockFlag = (flag: FeatureFlag) => {
  flagOnMock.mockImplementation(async (testFlag) => flag === testFlag);
};

describe("reportToApplicationErrorTelemetry", () => {
  beforeEach(async () => {
    flagOnMock.mockReset();
    jest.mocked(sendErrorViaErrorReporter).mockReset();
  });

  test("allow Application error telemetry reporting", async () => {
    flagOnMock.mockResolvedValue(false);

    const nestedError = new Error("nested cause");
    const reportedError = new Error("test", { cause: nestedError });
    await reportToApplicationErrorTelemetry(reportedError, {}, "error message");

    expect(flagOnMock).toHaveBeenCalledExactlyOnceWith(
      "application-error-telemetry-disable-report",
    );
    expect(sendErrorViaErrorReporter).toHaveBeenCalledOnce();
    expect(sendErrorViaErrorReporter).toHaveBeenCalledWith(
      expect.objectContaining({
        error: serializeError(reportedError),
        errorMessage: "error message",
        messageContext: expect.objectContaining({
          cause: nestedError,
          code: undefined,
          extensionVersion: "1.5.2",
          name: "Error",
          stack: expect.any(String),
        }),
      }),
    );
  });

  test("disable Application error telemetry reporting", async () => {
    mockFlag(FeatureFlags.APPLICATION_ERROR_TELEMETRY_DISABLE_REPORT);

    await reportToApplicationErrorTelemetry(new Error("test"), {}, "");

    expect(sendErrorViaErrorReporter).not.toHaveBeenCalled();
  });
});
