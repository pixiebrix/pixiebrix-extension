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
  createActivationUrl,
  isActivationUrl,
} from "@/activation/activationLinkUtils";
import { validateRegistryId } from "@/types/helpers";

describe("constructActivationUrl", () => {
  test("single id", () => {
    expect(
      createActivationUrl([validateRegistryId("test/123")]).toString(),
    ).toBe("https://app.pixiebrix.com/activate?id=test%2F123");
  });

  test("multiple ids", () => {
    expect(
      createActivationUrl([
        validateRegistryId("test/123"),
        validateRegistryId("test/abc"),
      ]).toString(),
    ).toBe(
      "https://app.pixiebrix.com/activate?id%5B%5D=test%2F123&id%5B%5D=test%2Fabc",
    );
  });
});

describe("isActivationUrl", () => {
  test("single id", () => {
    expect(
      isActivationUrl("https://app.pixiebrix.com/activate?id=test%2F123"),
    ).toBe(true);
  });

  test("login url", () => {
    expect(isActivationUrl("https://app.pixiebrix.com/login")).toBe(false);
  });
});
