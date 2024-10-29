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

import React, { useCallback, useReducer } from "react";
import { useDebouncedCallback } from "use-debounce";
import Loader from "@/components/Loader";
import { getErrorMessage } from "@/errors/errorHelpers";
import { runStarterBrickReaderPreview } from "@/contentScript/messenger/api";
import { adapterForComponent } from "@/pageEditor/starterBricks/adapter";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { faSync } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import AsyncButton from "@/components/AsyncButton";
import { isTriggerStarterBrick } from "@/pageEditor/starterBricks/formStateTypes";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import DataTabJsonTree from "@/pageEditor/tabs/editTab/dataPanel/DataTabJsonTree";
import { inspectedTab } from "@/pageEditor/context/connection";
import { assertNotNullish, type Nullishable } from "@/utils/nullishUtils";
import { StarterBrickTypes } from "@/types/starterBrickTypes";
import { useSelector } from "react-redux";
import {
  selectActiveModComponentFormState,
  selectGetOptionsArgsForModId,
} from "@/pageEditor/store/editor/editorSelectors";
import { useAsyncEffect } from "use-async-effect";

type PreviewState = {
  isRunning: boolean;
  output: unknown;
  error: unknown;
};

const initialState: PreviewState = {
  isRunning: false,
  output: null,
  error: null,
};

const previewSlice = createSlice({
  name: "starterBrickPreview",
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

const StarterBrickPreview: React.FC = () => {
  const [{ isRunning, output, error }, dispatch] = useReducer(
    previewSlice.reducer,
    initialState,
  );

  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );
  assertNotNullish(
    activeModComponentFormState,
    "StarterBrickPreview cannot be rendered without an activeModComponentFormState",
  );
  const { starterBrick } = activeModComponentFormState;

  const getOptionsArgsForModId = useSelector(selectGetOptionsArgsForModId);

  const run = useCallback(async () => {
    dispatch(previewSlice.actions.startRun());
    try {
      const { asDraftModComponent } = adapterForComponent(
        activeModComponentFormState,
      );

      // Handle click/blur/etc.-based triggers which expect to be run a subset of elements on the page and pass through
      // data about the element that caused the trigger
      let rootSelector: Nullishable<string> = null;
      if (
        isTriggerStarterBrick(starterBrick) &&
        starterBrick.definition.rootSelector
      ) {
        rootSelector = starterBrick.definition.rootSelector;
      }

      const data = await runStarterBrickReaderPreview(
        inspectedTab,
        asDraftModComponent(activeModComponentFormState, {
          optionsArgs: getOptionsArgsForModId(
            activeModComponentFormState.modMetadata.id,
          ),
        }),
        rootSelector,
      );
      dispatch(previewSlice.actions.runSuccess({ "@input": data }));
    } catch (error) {
      dispatch(previewSlice.actions.runError(error));
    }
  }, [activeModComponentFormState, getOptionsArgsForModId, starterBrick]);

  const debouncedRun = useDebouncedCallback(run, 250, {
    trailing: true,
    leading: false,
  });

  useAsyncEffect(debouncedRun, [
    debouncedRun,
    activeModComponentFormState.starterBrick,
  ]);

  if (isRunning) {
    return (
      <div>
        <Loader />
      </div>
    );
  }

  const { definition: starterBrickDefinition } = starterBrick;

  const reloadTrigger =
    starterBrickDefinition.type === StarterBrickTypes.TRIGGER &&
    starterBrickDefinition.trigger !== "load" ? (
      <div className="text-info">
        <AsyncButton
          variant="info"
          size="sm"
          className="mr-2"
          onClick={async () => run()}
        >
          <FontAwesomeIcon icon={faSync} /> Refresh
        </AsyncButton>
        Click to use focused element
      </div>
    ) : null;

  const reloadContextMenu =
    starterBrickDefinition.type === StarterBrickTypes.CONTEXT_MENU ? (
      <div className="text-info">
        <AsyncButton
          variant="info"
          size="sm"
          className="mr-2"
          onClick={async () => run()}
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
        tabKey={DataPanelTabKey.Output}
        label="Live Preview"
      />
    </div>
  );
};

export default StarterBrickPreview;
