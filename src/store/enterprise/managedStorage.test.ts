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

import {
  initializationTimestamp,
  INTERNAL_reset,
  readManagedStorage,
  readManagedStorageByKey,
} from "@/store/enterprise/managedStorage";
import { timestampFactory } from "@/testUtils/factories/stringFactories";

beforeEach(async () => {
  jest.clearAllMocks();
  await INTERNAL_reset();
  await browser.storage.managed.clear();
});

describe("readManagedStorage", () => {
  it("reads immediately if managed storage is already initialized", async () => {
    await initializationTimestamp.set(timestampFactory());
    await expect(readManagedStorage()).resolves.toStrictEqual({});

    // Should only be called once vs. polling
    expect(browser.storage.managed.get).toHaveBeenCalledOnce();
  });

  it("reads uninitialized managed storage", async () => {
    await expect(readManagedStorage()).resolves.toStrictEqual({});
  });

  it("reads managed storage", async () => {
    await browser.storage.managed.set({ partnerId: "taco-bell" });
    await expect(readManagedStorage()).resolves.toStrictEqual({
      partnerId: "taco-bell",
    });
  });
});

describe("readManagedStorageByKey", () => {
  it("reads uninitialized managed storage", async () => {
    await expect(readManagedStorageByKey("partnerId")).resolves.toBeUndefined();
  });

  it("reads managed storage", async () => {
    await browser.storage.managed.set({ partnerId: "taco-bell" });
    await expect(readManagedStorageByKey("partnerId")).resolves.toBe(
      "taco-bell",
    );
  });
});
