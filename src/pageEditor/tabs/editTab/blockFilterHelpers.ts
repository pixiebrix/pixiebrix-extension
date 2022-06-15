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

import { TypedBlock } from "@/blocks/registry";
import { validateRegistryId } from "@/types/helpers";
import { BlockType } from "@/runtime/runtimeTypes";
import { ExtensionPointType } from "@/extensionPoints/types";

const PANEL_TYPES = ["actionPanel", "panel"];

const alwaysShow = new Set([
  // Cancel/Error provide meaningful control flow for all bricks
  validateRegistryId("@pixiebrix/cancel"),
  validateRegistryId("@pixiebrix/error"),
]);

export type IsBrickAllowedPredicate = (block: TypedBlock) => boolean;

export function makeIsAllowedForRootPipeline(
  extensionPointType: ExtensionPointType
) {
  const excludeType: BlockType = PANEL_TYPES.includes(extensionPointType)
    ? "effect"
    : "renderer";

  return ({ type, block }: TypedBlock) =>
    (type != null && type !== excludeType) || alwaysShow.has(block.id);
}
