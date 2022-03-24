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

import { IBlock, IService } from "@/core";
import { BlockType } from "@/runtime/runtimeTypes";

export default async function getType(
  // HACK: including IService here is a hack to fix some call-sites. This method can only return block types
  block: IBlock | IService
): Promise<BlockType | null> {
  if ("inferType" in block) {
    // For YAML-based blocks, can't use the method to determine the type because only the "run" method is available.
    // The inferType method is provided ExternalBlock, which is the class used for YAML-based blocks (which have
    // kind: component) in their YAML
    return (block as any).inferType();
  }

  if ("read" in block) {
    return "reader";
  }

  if ("effect" in block) {
    return "effect";
  }

  if ("transform" in block) {
    return "transform";
  }

  if ("render" in block) {
    return "renderer";
  }

  return null;
}
