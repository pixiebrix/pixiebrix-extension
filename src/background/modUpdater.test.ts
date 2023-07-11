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

import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { autoModUpdatesEnabled } from "@/background/modUpdater";
import reportError from "@/telemetry/reportError";

const axiosMock = new MockAdapter(axios);

jest.mock("@/telemetry/reportError", () => jest.fn());
describe("autoModUpdatesEnabled function", () => {
  it("should return false if flag absent", async () => {
    axiosMock.onGet().reply(200, {
      flags: [],
    });

    const result = await autoModUpdatesEnabled();

    expect(result).toBe(false);
  });

  it("should return true if flag present", async () => {
    axiosMock.onGet().reply(200, {
      flags: ["automatic-mod-updates"],
    });

    const result = await autoModUpdatesEnabled();

    expect(result).toBe(true);
  });

  it("should return false on error", async () => {
    axiosMock.onGet().reply(500, {});

    const result = await autoModUpdatesEnabled();

    expect(result).toBe(false);
    expect(reportError).toHaveBeenCalled();
  });
});
