/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import {
  proxyResponseToAxiosResponse,
  selectRemoteResponseErrorMessage,
} from "@/background/proxyUtils";

describe("selectRemoteResponseErrorMessage", () => {
  it("prefers top-level message", () => {
    const result = selectRemoteResponseErrorMessage({
      message: "top-level message",
      status_code: 400,
      json: { error: { message: "json message" } },
    });
    expect(result).toBe("top-level message");
  });

  it("handles message in payload", () => {
    const result = selectRemoteResponseErrorMessage({
      message: undefined,
      status_code: 400,
      json: { message: "json message" },
    });
    expect(result).toBe("json message");
  });

  it("punts on non-string payload", () => {
    const result = selectRemoteResponseErrorMessage({
      message: undefined,
      status_code: 400,
      json: { message: ["json message"] },
    });
    expect(result).toBe("Bad Request");
  });

  it("handles error.message in payload", () => {
    const result = selectRemoteResponseErrorMessage({
      message: undefined,
      status_code: 400,
      json: { error: { message: "json message" } },
    });
    expect(result).toBe("json message");
  });

  it("falls back to reason", () => {
    const result = selectRemoteResponseErrorMessage({
      message: undefined,
      status_code: 400,
      reason: "Custom Reason",
      json: {},
    });
    expect(result).toBe("Custom Reason");
  });

  it("falls back to status", () => {
    const result = selectRemoteResponseErrorMessage({
      message: undefined,
      status_code: 400,
      json: {},
    });
    expect(result).toBe("Bad Request");
  });
});

describe("proxyResponseToAxiosResponse", () => {
  it("converts a 404 bad request", () => {
    const result = proxyResponseToAxiosResponse({
      json: {
        error: {
          code: 404,
          message: "ID not found",
        },
      },
      status_code: 404,
    });

    expect(result).toStrictEqual({
      data: {
        error: {
          code: 404,
          message: "ID not found",
        },
      },
      status: 404,
      statusText: undefined,
    });
  });
});
