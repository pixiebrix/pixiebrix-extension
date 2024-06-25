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

import { getNotifier } from "webext-messenger";

jest.mock("webext-messenger");

describe("reportError", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let _recordMock: jest.Mock;

  let reportError: any;
  beforeAll(() => {
    _recordMock = jest.fn();
    jest.mocked(getNotifier).mockReturnValue(_recordMock);

    // Using require since the module uses an import-time initialization of the messenger which needs to be mocked
    reportError = require("./reportError").default;
  });

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.resetAllMocks();
  });

  it("should log error to console if logToConsole is true", () => {
    const error = new Error("Test error");
    reportError(error, { logToConsole: true });
    expect(consoleErrorSpy).toHaveBeenCalledWith(error, { context: {} });
  });

  it("should not log error to console if logToConsole is false", () => {
    const error = new Error("Test error");
    reportError(error, { logToConsole: false });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("should not report error if it should be ignored", () => {
    // "ResizeObserver loop limit exceeded" is an ignored error
    const shouldBeIgnoredError = new Error(
      "ResizeObserver loop limit exceeded",
    );
    reportError(shouldBeIgnoredError);
    expect(_recordMock).not.toHaveBeenCalled();
  });

  it("should report error if it should not be ignored", () => {
    const error = new Error("Test error");
    reportError(error);
    expect(_recordMock).toHaveBeenCalledWith(
      {
        message: "Test error",
        name: "Error",
        stack: expect.stringMatching(/^Error: Test error\n {4}at Object/),
      },
      {
        connectionType: "unknown",
        pageName: "extension",
        referrer: "",
        url: "http://localhost/",
      },
    );
  });

  it("should log error to console if an error occurs while reporting the error", () => {
    const error = new Error("Test error");
    const reportingError = new Error("Reporting error");
    _recordMock.mockImplementation(() => {
      throw reportingError;
    });
    reportError(error);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "An error occurred when reporting an error",
      {
        originalError: error,
        reportingError,
      },
    );
  });
});
