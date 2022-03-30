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
import { faSync } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { Button } from "react-bootstrap";
import { useSelector } from "react-redux";
import ErrorDisplay from "./ErrorDisplay";

const PageStateTab: React.VFC = () => {
  const activeElement = useSelector(selectActiveElement);
  const [
    sharedState,
    isSharedStateLoading,
    sharedStateError,
    refreshSharedState,
  ] = useAsyncState(async () => getPageState(thisTab, "shared"), []);

  const [
    blueprintState,
    isBlueprintStateLoading,
    blueprintStateError,
    refreshBlueprintState,
  ] = useAsyncState(
    async () =>
      activeElement.recipe
        ? getPageState(thisTab, "blueprint", activeElement.recipe.id)
        : null,
    []
  );

  const [
    extensionState,
    isExtensionStateLoading,
    extensionStateError,
    refreshExtensionState,
  ] = useAsyncState(
    async () => getPageState(thisTab, "extension", null, activeElement.uuid),
    []
  );

  const isLoading =
    isSharedStateLoading || isBlueprintStateLoading || isExtensionStateLoading;
  const error = sharedStateError ?? blueprintStateError ?? extensionStateError;
  const refreshState = () => {
    void refreshSharedState();
    void refreshBlueprintState();
    void refreshExtensionState();
  };

  const state = {
    extension: isExtensionStateLoading ? "loading..." : extensionState,
    blueprint: isBlueprintStateLoading ? "loading..." : blueprintState,
    shared: isSharedStateLoading ? "loading..." : sharedState,
  };

  return (
    <div>
      <Button
        variant="info"
        size="sm"
        disabled={isLoading}
        onClick={refreshState}
      >
        <FontAwesomeIcon icon={faSync} /> Refresh
      </Button>
      {error ? (
        <ErrorDisplay error={error} />
      ) : (
        <JsonTree data={state} copyable shouldExpandNode={() => true} />
      )}
    </div>
  );
};

export default PageStateTab;
