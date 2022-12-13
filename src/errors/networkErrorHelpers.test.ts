/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
  isAxiosError,
  isBadRequestObjectData,
  isSingleObjectBadRequestError,
} from "@/errors/networkErrorHelpers";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";

const axiosMock = new MockAdapter(axios);

const CONFIG_ERROR = {
  config: [
    "Cannot overwrite version of a published brick. Increment the version",
  ],
};

describe("isBadRequestObjectData", () => {
  test("detects config error", () => {
    expect(isBadRequestObjectData(CONFIG_ERROR)).toBe(true);
  });
});

describe("isSingleObjectBadRequestError", () => {
  test("handles error-like object", async () => {
    axiosMock.onPut().reply(400, CONFIG_ERROR);

    try {
      await axios.create().put("/", {});
      expect.fail("Expected error");
    } catch (error) {
      expect(isAxiosError(error)).toBe(true);
      expect(isSingleObjectBadRequestError(error)).toBe(true);
    }
  });
});
