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

import { Brick } from "@/types/contract";
import { startCase } from "lodash";

const kindDisplayNameMap = new Map<Brick["kind"], string>([
  ["block", "Brick"],
  ["reader", "Brick"],
  ["blueprint", "Mod"],
  ["recipe", "Mod"],
  ["service", "Integration"],
  // Full name is "starter brick", but user shorter name
  ["foundation", "Starter"],
]);

/**
 * Returns the display name for a brick kind.
 * @since 1.7.20
 */
export function getKindDisplayName(kind: Brick["kind"]): string {
  // Be defensive and lowercase for the match, some callers may not have the correct casing
  return (
    kindDisplayNameMap.get(kind.toLowerCase() as Brick["kind"]) ??
    startCase(kind)
  );
}
