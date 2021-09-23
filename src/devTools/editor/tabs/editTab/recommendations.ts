/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { ElementType } from "@/devTools/editor/extensionPoints/elementConfig";
import { RegistryId } from "@/core";
import blockRegistry from "@/blocks/registry";
import { getType } from "@/blocks/util";
import { uniq } from "lodash";
import { allSettledValues } from "@/utils";

const READER_COUNT_THRESHOLD = 1;

const typeRecommendations = new Map<ElementType, RegistryId[]>([
  [
    "menuItem",
    [
      "@pixiebrix/browser/open-tab",
      "@pixiebrix/zapier/push-data",
      "@pixiebrix/forms/set",
    ],
  ],
  [
    "trigger",
    [
      "@pixiebrix/google/sheets-append",
      "@pixiebrix/highlight",
      "@pixiebrix/zapier/push-data",
    ],
  ],
  [
    "contextMenu",
    [
      "@pixiebrix/browser/open-tab",
      "@pixiebrix/zapier/push-data",
      "slack/simple-message",
      "@pixiebrix/google/sheets-append",
    ],
  ],
  [
    "panel",
    ["@pixiebrix/property-table", "@pixiebrix/iframe", "@pixiebrix/get"],
  ],
  [
    "actionPanel",
    ["@pixiebrix/property-table", "@pixiebrix/iframe", "@pixiebrix/get"],
  ],
] as Array<[ElementType, RegistryId[]]>);

const readerLike = [
  // The following two bricks are technically "transforms", but serve the roles as readers
  "@pixiebrix/forms/data",
  "@pixiebrix/jquery-reader",
  "@pixiebrix/component-reader",
];

const commonReaders = [
  "@pixiebrix/document-metadata",
  "@pixiebrix/jquery-reader",
  "@pixiebrix/component-reader",
] as RegistryId[];

export async function getRecommendations(
  elementType: ElementType,
  current: RegistryId[]
): Promise<RegistryId[]> {
  // Ignore errors resolving blocks. Errors can be caused by any number of things, e.g., internal ids, etc.
  const currentBlocks = await allSettledValues(
    current.map(async (registryId) => {
      const block = await blockRegistry.lookup(registryId);
      const type = await getType(block);
      return {
        block,
        type,
        isReaderLike: type === "reader" || readerLike.includes(registryId),
      };
    })
  );

  const readerCount = currentBlocks.filter((x) => x.isReaderLike).length;

  if (readerCount >= READER_COUNT_THRESHOLD) {
    return typeRecommendations.get(elementType);
  }

  return uniq([...commonReaders, ...typeRecommendations.get(elementType)]);
}
