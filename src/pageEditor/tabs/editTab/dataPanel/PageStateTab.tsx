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

import JsonTree from "@/components/jsonTree/JsonTree";
import { getPageState } from "@/contentScript/messenger/api";
import { useAsyncState } from "@/hooks/common";
import { selectActiveElement } from "@/pageEditor/slices/editorSelectors";
import { thisTab } from "@/pageEditor/utils";
import React from "react";
import { useSelector } from "react-redux";
import ErrorDisplay from "./ErrorDisplay";

const PageStateTab: React.VFC = () => {
  const activeElement = useSelector(selectActiveElement);
  const [sharedState, isSharedStateLoading, sharedStateError] = useAsyncState(
    async () => getPageState(thisTab, "shared"),
    []
  );

  const [blueprintState, isBlueprintStateLoading, blueprintStateError] =
    useAsyncState(
      async () =>
        activeElement.recipe
          ? getPageState(thisTab, "blueprint", activeElement.recipe.id)
          : null,
      []
    );

  const [extensionState, isExtensionStateLoading, extensionStateError] =
    useAsyncState(
      async () => getPageState(thisTab, "extension", null, activeElement.uuid),
      []
    );

  if (sharedStateError || blueprintStateError || extensionStateError) {
    return (
      <ErrorDisplay
        error={sharedStateError ?? blueprintStateError ?? extensionStateError}
      />
    );
  }

  const state = {
    extension: isExtensionStateLoading ? "loading..." : extensionState,
    blueprint: isBlueprintStateLoading ? "loading..." : blueprintState,
    shared: isSharedStateLoading ? "loading..." : sharedState,
  };

  return <JsonTree data={state} copyable shouldExpandNode={() => true} />;
};

export default PageStateTab;
