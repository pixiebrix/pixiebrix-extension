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
import { isObject } from "@/utils/objectUtils";

function canInferType(
  brick: unknown,
): brick is { inferType: () => Promise<BrickType | null> } {
  return isObject(brick) && typeof brick.inferType === "function";
}

/**
 * Returns the type of the brick, or `null` if the type cannot be determined.
 */
export default async function getType(
  brick: Metadata,
): Promise<BrickType | null> {
  if (canInferType(brick)) {
    // HACK: including Integration and StarterBrick here is a hack to fix some call-sites. This method can only return
    // brick types.
    // For YAML-based bricks, can't use the method to determine the type because only the "run" method is available.
    // The inferType method is provided UserDefinedBrick, which is the class used for YAML-based bricks (which have
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
