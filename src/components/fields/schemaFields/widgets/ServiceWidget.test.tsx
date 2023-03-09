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

import { defaultOutputKey } from "@/components/fields/schemaFields/widgets/ServiceWidget";
import { validateRegistryId } from "@/types/helpers";
import { validateOutputKey } from "@/runtime/runtimeTypes";

describe("defaultOutputKey", () => {
  test("should handle default", () => {
    expect(defaultOutputKey(null, [])).toBe("service");
  });

  test("should handle id without collection", () => {
    expect(defaultOutputKey(validateRegistryId("google/sheet"), [])).toBe(
      "google"
    );
  });

  test("should generate fresh identifier", () => {
    expect(
      defaultOutputKey(validateRegistryId("google/sheet"), [
        validateOutputKey("google"),
      ])
    ).toBe("google2");
  });
});
