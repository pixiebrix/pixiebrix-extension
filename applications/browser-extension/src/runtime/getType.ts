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
import { type PackageInstance } from "@/types/registryTypes";
import { type Nullishable } from "@/utils/nullishUtils";
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
  packageInstance: Nullishable<PackageInstance>,
): Promise<BrickType | null> {
  if (packageInstance == null) {
    return null;
  }

  if (canInferType(packageInstance)) {
    // HACK: including Integration and StarterBrick here is a hack to fix some call-sites. This method can only return
    // brick types.
    // For YAML-based bricks, can't use the method to determine the type because only the "run" method is available.
    // The inferType method is provided UserDefinedBrick, which is the class used for YAML-based bricks (which have
    // kind: component) in their YAML
    return packageInstance.inferType();
  }

  if ("read" in packageInstance) {
    return "reader";
  }

  if ("effect" in packageInstance) {
    return "effect";
  }

  if ("transform" in packageInstance) {
    return "transform";
  }

  if ("render" in packageInstance) {
    return "renderer";
  }

  return null;
}
