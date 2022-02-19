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

import { RegistryId } from "@/core";
import blockRegistry from "@/blocks/registry";
import { getType } from "@/blocks/util";
import { isEqual, uniq } from "lodash";
import { allSettledValues } from "@/utils";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import { useFormikContext } from "formik";
import { useDebounce } from "use-debounce";
import { useAsyncState } from "@/hooks/common";
import { collectRegistryIds } from "@/devTools/editor/tabs/editTab/editHelpers";
import { ExtensionPointType } from "@/extensionPoints/types";

const READER_COUNT_THRESHOLD = 2;

const typeRecommendations = new Map<ExtensionPointType, RegistryId[]>([
  [
    "menuItem",
    [
      "@pixiebrix/form-modal",
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
      "@pixiebrix/form-modal",
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
    "sidebar",
    ["@pixiebrix/property-table", "@pixiebrix/iframe", "@pixiebrix/get"],
  ],
] as Array<[ExtensionPointType, RegistryId[]]>);

const readerLike = [
  // The following two bricks are technically "transforms", but serve the roles as readers
  "@pixiebrix/forms/data",
  "@pixiebrix/jquery-reader",
  "@pixiebrix/component-reader",
];

const commonReaders = [
  "@pixiebrix/jquery-reader",
  "@pixiebrix/component-reader",
] as RegistryId[];

async function getRecommendations(
  elementType: ExtensionPointType,
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

function selectState(formState: FormState) {
  return [formState.type, collectRegistryIds(formState)];
}

const DEFAULT_RECOMMENDATIONS: RegistryId[] = [];

function useBrickRecommendations(): RegistryId[] {
  const { values } = useFormikContext<FormState>();

  const [debouncedValues] = useDebounce(values, 750, {
    leading: true,
    trailing: true,
    equalityFn: (lhs, rhs) => isEqual(selectState(lhs), selectState(rhs)),
  });

  const [recommendations] = useAsyncState(async () => {
    const { type } = debouncedValues;
    return getRecommendations(type, collectRegistryIds(values));
  }, [debouncedValues]);

  return recommendations ?? DEFAULT_RECOMMENDATIONS;
}

export default useBrickRecommendations;
