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

import { launchWebAuthFlow } from "@/background/auth/authHelpers";
import { InteractiveLoginRequiredError } from "@/errors/authErrors";

browser.identity = {
  launchWebAuthFlow: jest.fn(),
  getRedirectURL: jest.fn(),
};

describe("launchWebAuthFlow", () => {
  it("wraps interaction error in InteractiveLoginRequiredError", async () => {
    jest
      .mocked(browser.identity.launchWebAuthFlow)
      .mockRejectedValue(new Error("User interaction required."));

    await expect(
      launchWebAuthFlow({
        url: "https://www.example.com",
        interactive: false,
      }),
    ).rejects.toThrow(InteractiveLoginRequiredError);
  });
});
