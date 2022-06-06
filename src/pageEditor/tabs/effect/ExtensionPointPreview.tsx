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

import React, { useCallback, useEffect, useReducer } from "react";
import { useDebouncedCallback } from "use-debounce";
import Loader from "@/components/Loader";
import { getErrorMessage } from "@/errors/errorHelpers";
import { UnknownObject } from "@/types";
import { runExtensionPointReader } from "@/contentScript/messenger/api";
import { thisTab } from "@/pageEditor/utils";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { faSync } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import AsyncButton from "@/components/AsyncButton";
import { FormState } from "@/pageEditor/pageEditorTypes";
import { TriggerFormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import DataTabJsonTree from "@/pageEditor/tabs/editTab/dataPanel/DataTabJsonTree";

type PreviewState = {
  isRunning: boolean;
  output: unknown | null;
  error: unknown | null;
};

const initialState: PreviewState = {
  isRunning: false,
  output: null,
  error: null,
};

const previewSlice = createSlice({
  name: "extensionPointPreview",
  initialState,
  reducers: {
    startRun(state) {
      state.isRunning = true;
    },
    runSuccess(state, { payload }: PayloadAction<UnknownObject>) {
      state.isRunning = false;
      state.output = payload;
      state.error = null;
    },
    runError(state, { payload }: PayloadAction<unknown>) {
      state.isRunning = false;
      state.output = null;
      state.error = payload;
    },
  },
});

const ExtensionPointPreview: React.FunctionComponent<{
  element: FormState;
  previewRefreshMillis?: 250;
}> = ({ element, previewRefreshMillis }) => {
  const [{ isRunning, output, error }, dispatch] = useReducer(
    previewSlice.reducer,
    initialState
  );

  const run = useCallback(async (element: FormState) => {
    dispatch(previewSlice.actions.startRun());
    try {
      const { asDynamicElement: factory } = ADAPTERS.get(element.type);

      // Handle click/blur/etc.-based triggers which expect to be run a subset of elements on the page and pass through
      // data about the element that caused the trigger
      let rootSelector: string = null;
      if (
        (element as TriggerFormState).extensionPoint.definition.rootSelector
      ) {
        rootSelector = (element as TriggerFormState).extensionPoint.definition
          .rootSelector;
      }

      const data = await runExtensionPointReader(
        thisTab,
        factory(element),
        rootSelector
      );
      dispatch(previewSlice.actions.runSuccess({ "@input": data }));
    } catch (error) {
      dispatch(previewSlice.actions.runError(error));
    }
  }, []);

  const debouncedRun = useDebouncedCallback(
    async (element: FormState) => run(element),
    previewRefreshMillis,
    { trailing: true, leading: false }
  );

  useEffect(() => {
    void debouncedRun(element);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- using objectHash for context
  }, [debouncedRun, element.extensionPoint]);

  if (isRunning) {
    return (
      <div>
        <Loader />
      </div>
    );
  }

  const reloadTrigger =
    element.type === "trigger" &&
    element.extensionPoint.definition.trigger !== "load" ? (
      <div className="text-info">
        <AsyncButton
          variant="info"
          size="sm"
          className="mr-2"
          onClick={async () => run(element)}
        >
          <FontAwesomeIcon icon={faSync} /> Refresh
        </AsyncButton>
        Click to use focused element
      </div>
    ) : null;

  const reloadContextMenu =
    element.type === "contextMenu" ? (
      <div className="text-info">
        <AsyncButton
          variant="info"
          size="sm"
          className="mr-2"
          onClick={async () => run(element)}
        >
          <FontAwesomeIcon icon={faSync} /> Refresh
        </AsyncButton>
        Click to use current selection/focused element
      </div>
    ) : null;

  if (error) {
    return (
      <div className="text-danger">
        {reloadTrigger}
        {reloadContextMenu}
        {getErrorMessage(error)}
      </div>
    );
  }

  return (
    <div>
      {reloadTrigger}
      {reloadContextMenu}
      <DataTabJsonTree
        data={output ?? {}}
        searchable
        copyable
        tabKey={DataPanelTabKey.Preview}
      />
    </div>
  );
};

export default ExtensionPointPreview;
