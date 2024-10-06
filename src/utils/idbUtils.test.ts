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

import { withIdbErrorHandling } from "./idbUtils";
import { deleteDB, type IDBPDatabase } from "idb";
import { reportToApplicationErrorTelemetry } from "@/telemetry/reportToApplicationErrorTelemetry";

jest.mock("@/telemetry/reportToApplicationErrorTelemetry");
jest.mock("idb");

describe("withIdbErrorHandling", () => {
  const mockOpenIDB = jest.fn();
  const mockDbOperation = jest.fn();
  const databaseName = "LOG";
  const operationName = "appendEntry";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should ensure close is called on db after successful operation", async () => {
    const closeMock = jest.fn();
    const mockDb = { close: closeMock } as unknown as IDBPDatabase<any>;
    mockOpenIDB.mockResolvedValue(mockDb);
    mockDbOperation.mockResolvedValue("success");

    const result = await withIdbErrorHandling(mockOpenIDB, databaseName)(
      mockDbOperation,
      {
        operationName,
      },
    );

    expect(result).toBe("success");
    expect(mockOpenIDB).toHaveBeenCalledTimes(1);
    expect(mockDbOperation).toHaveBeenCalledExactlyOnceWith(mockDb);
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("should succeed on a retry and report retried error", async () => {
    const closeMock = jest.fn();
    const mockDb = { close: closeMock } as unknown as IDBPDatabase<any>;
    mockOpenIDB.mockResolvedValue(mockDb);
    mockDbOperation
      .mockRejectedValueOnce(new Error("Temporary error"))
      .mockResolvedValue("success");

    const result = await withIdbErrorHandling(mockOpenIDB, databaseName)(
      mockDbOperation,
      {
        operationName,
        shouldRetry: () => true,
      },
    );

    expect(result).toBe("success");
    expect(mockOpenIDB).toHaveBeenCalledTimes(2);
    expect(mockDbOperation).toHaveBeenCalledTimes(2);
    expect(reportToApplicationErrorTelemetry).toHaveBeenCalledOnce();
    expect(reportToApplicationErrorTelemetry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        idbOperationName: operationName,
        idbDatabaseName: databaseName,
      }),
      expect.any(String),
    );
    expect(closeMock).toHaveBeenCalledTimes(2);
  });

  it("should handle failed retries", async () => {
    const closeMock = jest.fn();
    const onFailedAttemptMock = jest.fn();
    const mockDb = { close: closeMock } as unknown as IDBPDatabase<any>;
    mockOpenIDB.mockResolvedValue(mockDb);
    mockDbOperation.mockRejectedValue(new Error("Permanent error"));

    await expect(
      withIdbErrorHandling(mockOpenIDB, databaseName)(mockDbOperation, {
        operationName,
        shouldRetry: () => true,
        onFailedAttempt: onFailedAttemptMock,
      }),
    ).rejects.toThrow("Permanent error");

    expect(mockOpenIDB).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    expect(mockDbOperation).toHaveBeenCalledTimes(4);
    expect(onFailedAttemptMock).toHaveBeenCalledTimes(4);
    expect(reportToApplicationErrorTelemetry).toHaveBeenCalledTimes(4);
    expect(deleteDB).not.toHaveBeenCalled();
  }, 10_000); // Increased timeout due to default backoffs in p-retry

  it("should delete the database if it fails all retries with IDBLargeValueError", async () => {
    const closeMock = jest.fn();
    const onFailedAttemptMock = jest.fn();
    const mockDb = { close: closeMock } as unknown as IDBPDatabase<any>;
    mockOpenIDB.mockResolvedValue(mockDb);
    mockDbOperation.mockRejectedValue(
      new DOMException("Failed to read large IndexedDB value"),
    );

    await expect(
      withIdbErrorHandling(mockOpenIDB, databaseName)(mockDbOperation, {
        operationName,
        shouldRetry: () => true,
        onFailedAttempt: onFailedAttemptMock,
      }),
    ).rejects.toThrow("Failed to read large IndexedDB value");

    expect(mockOpenIDB).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    expect(mockDbOperation).toHaveBeenCalledTimes(4);
    expect(onFailedAttemptMock).toHaveBeenCalledTimes(4);

    expect(deleteDB).toHaveBeenCalledWith(databaseName, expect.anything());
  }, 10_000); // Increased timeout due to default backoffs in p-retry
});
