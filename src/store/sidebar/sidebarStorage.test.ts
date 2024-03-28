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

import { initialSidebarState } from "@/store/sidebar/initialState";
import {
  STORAGE_KEY,
  getSidebarState,
  saveSidebarState,
} from "@/store/sidebar/sidebarStorage";
import { readReduxStorage, setReduxStorage } from "@/utils/storageUtils";

jest.mock("@/utils/storageUtils", () => {
  const actual = jest.requireActual("@/utils/storageUtils");

  return {
    ...actual,
    readReduxStorage: jest.fn(),
    setReduxStorage: jest.fn(),
  };
});

const readReduxStorageMock = jest.mocked(readReduxStorage);
const setReduxStorageMock = jest.mocked(setReduxStorage);

describe("sidebarStorage", () => {
  describe("getSidebarState", () => {
    it("readReduxStorageMock is called with the STORAGE_KEY, no migrations, and the initialSidebarState", async () => {
      void getSidebarState();

      expect(readReduxStorageMock).toHaveBeenCalledWith(
        STORAGE_KEY,
        {},
        initialSidebarState,
      );
    });
  });

  describe("saveSidebarState", () => {
    it("setReduxStorage is called with the STORAGE_KEY, the passed in state, and 0 because there are no migrations", async () => {
      const state = { ...initialSidebarState, closedTabs: { foo: true } };
      void saveSidebarState(state);

      expect(setReduxStorageMock).toHaveBeenCalledWith(STORAGE_KEY, state, 0);
    });
  });
});
