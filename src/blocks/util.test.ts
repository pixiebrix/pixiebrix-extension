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

import { isOfficial } from "./util";
import { RegistryId } from "@/core";

describe("isOfficial", () => {
  test("returns true for an official block", () => {
    expect(isOfficial("@pixiebrix/api" as RegistryId)).toBeTruthy();
  });
  test("returns false for a 3d-party block", () => {
    expect(isOfficial("@non/pixiebrix" as RegistryId)).toBeFalsy();
  });
});
