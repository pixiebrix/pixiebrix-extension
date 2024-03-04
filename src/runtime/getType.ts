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

import { type BrickType } from "@/runtime/runtimeTypes";
import { type Metadata } from "@/types/registryTypes";

/**
 * Returns the type of the brick, or `null` if the type cannot be determined.
 * @param brick
 */
export default async function getType<T extends Metadata>(
  // HACK: T extends Metadata (which includes Integration and StarterBrick) here as a hack to fix some call-sites.
  // This getType method can only return brick types
  brick: T,
): Promise<BrickType | null> {
  if ("inferType" in brick && typeof brick.inferType === "function") {
    // For YAML-based blocks, can't use the method to determine the type because only the "run" method is available.
    // The inferType method is provided UserDefinedBrick, which is the class used for YAML-based blocks (which have
    // kind: component) in their YAML
    return brick.inferType();
  }

  if ("read" in brick) {
    return "reader";
  }

  if ("effect" in brick) {
    return "effect";
  }

  if ("transform" in brick) {
    return "transform";
  }

  if ("render" in brick) {
    return "renderer";
  }

  return null;
}
