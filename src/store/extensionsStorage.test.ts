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
  inferModComponentStateVersion,
  migrations,
} from "@/store/extensionsMigrations";
import { initialState } from "@/store/extensionsSliceInitialState";
import {
  getModComponentState,
  persistModComponentOptionsConfig,
} from "@/store/extensionsStorage";
import { getMaxMigrationsVersion } from "@/store/migratePersistedState";
import {
  readReduxStorage,
  validateReduxStorageKey,
} from "@/utils/storageUtils";

jest.mock("@/utils/storageUtils", () => {
  const actual = jest.requireActual("@/utils/storageUtils");

  return {
    ...actual,
    readReduxStorage: jest.fn(),
  };
});

const readReduxStorageMock = jest.mocked(readReduxStorage);
const inferModComponentStateVersionMock = jest.mocked(
  inferModComponentStateVersion,
);

const STORAGE_KEY = validateReduxStorageKey("persist:extensionOptions");
describe("getModComponentState", () => {
  test("readReduxStorage is called with inferModComponentStateVersion", async () => {
    void getModComponentState();
    expect(readReduxStorageMock).toHaveBeenCalledWith(
      STORAGE_KEY,
      migrations,
      initialState,
      inferModComponentStateVersionMock,
    );
  });
});

describe("persistExtensionOptionsConfig", () => {
  test("version is the highest migration version", () => {
    const maxVersion = getMaxMigrationsVersion(migrations);
    expect(persistModComponentOptionsConfig.version).toBe(maxVersion);
  });
});
