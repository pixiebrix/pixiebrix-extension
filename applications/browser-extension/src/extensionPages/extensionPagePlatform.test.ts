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

import extensionPagePlatform from "./extensionPagePlatform";
import { setPlatform } from "../platform/platformContext";
import { modComponentFactory } from "../testUtils/factories/modComponentFactories";
import { clearModComponentDebugLogs, traces } from "@/background/messenger/api";

jest.mock("../background/messenger/api", () => ({
  clearModComponentDebugLogs: jest.fn(),
  traces: {
    clear: jest.fn(),
  },
}));

const tracesClearMock = jest.mocked(traces.clear);
const clearModComponentDebugLogsMock = jest.mocked(clearModComponentDebugLogs);

describe("extensionPagePlatform", () => {
  beforeEach(() => {
    setPlatform(extensionPagePlatform);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("debugger", () => {
    it("clears traces and clears logs when logValues is true", async () => {
      const componentId = modComponentFactory().id;
      await extensionPagePlatform.debugger.clear(componentId, {
        logValues: true,
      });

      expect(tracesClearMock).toHaveBeenCalledExactlyOnceWith(componentId);
      expect(clearModComponentDebugLogsMock).toHaveBeenCalledExactlyOnceWith(
        componentId,
      );
    });

    it("clears traces and skips clearing logs when logValues is false", async () => {
      const componentId = modComponentFactory().id;
      await extensionPagePlatform.debugger.clear(componentId, {
        logValues: false,
      });

      expect(tracesClearMock).toHaveBeenCalledExactlyOnceWith(componentId);
      expect(clearModComponentDebugLogsMock).not.toHaveBeenCalled();
    });
  });
});
