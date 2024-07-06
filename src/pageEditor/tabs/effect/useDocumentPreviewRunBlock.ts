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

import { useEffect, useReducer } from "react";
import { usePreviewInfo } from "@/pageEditor/tabs/effect/BrickPreview";
import { isTriggerStarterBrick } from "@/pageEditor/starterBricks/formStateTypes";
import { useSelector } from "react-redux";
import {
  selectActiveModComponentFormState,
  selectActiveModComponentNodeInfo,
  selectParentNodeInfo,
} from "@/pageEditor/store/editor/editorSelectors";
import { getErrorMessage, type SimpleErrorObject } from "@/errors/errorHelpers";
import { type SerializableResponse } from "@/types/messengerTypes";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { useDebouncedCallback } from "use-debounce";
import { runRendererBrick } from "@/contentScript/messenger/api";
import { removeEmptyValues } from "@/pageEditor/starterBricks/base";
import { selectActiveModComponentTraceForBrick } from "@/pageEditor/store/runtime/runtimeSelectors";
import { type UUID } from "@/types/stringTypes";
import { type BrickArgsContext } from "@/types/runtimeTypes";
import { isExpression } from "@/utils/expressionUtils";
import makeIntegrationsContextFromDependencies from "@/integrations/util/makeIntegrationsContextFromDependencies";
import useAsyncState from "@/hooks/useAsyncState";
import { inspectedTab } from "@/pageEditor/context/connection";

type Location = "modal" | "panel";

type BlockPreviewState = {
  /**
   * The output from the block
   */
  output: SerializableResponse | null;

  /**
   * An error that occurred while running the block
   */
  error: SimpleErrorObject | null;

  /**
   * Is the preview currently running?
   */
  isRunning: boolean;
};

type BlockPreviewRunBlock = BlockPreviewState & {
  /**
   * The handler to run the block
   */
  runBlockPreview: () => void;
};

const initialState: BlockPreviewState = {
  output: null,
  error: null,
  isRunning: false,
};

const previewSlice = createSlice({
  name: "previewSlice",
  initialState,
  reducers: {
    startPreview(state) {
      state.error = null;
      state.isRunning = true;
      // Leave the previous output available during the run, don't clear it
    },
    setSuccess(state, action: PayloadAction<{ output: SerializableResponse }>) {
      const { output } = action.payload;
      state.output = output;
      state.error = null;
      state.isRunning = false;
    },
    setError(state, action: PayloadAction<{ error: SimpleErrorObject }>) {
      state.output = null;
      const { error } = action.payload;
      state.error = error;
      state.isRunning = false;
    },
  },
});

/**
 * Get a handler to run a "preview" of a document renderer brick.
 * @param brickInstanceId the node id of the brick to run
 */
export default function useDocumentPreviewRunBlock(
  brickInstanceId: UUID,
): BlockPreviewRunBlock {
  const [state, dispatch] = useReducer(previewSlice.reducer, initialState);

  const {
    uuid: modComponentId,
    modMetadata: mod,
    apiVersion,
    integrationDependencies,
    starterBrick,
  } = useSelector(selectActiveModComponentFormState);

  const { blockConfig: brickConfig } = useSelector(
    selectActiveModComponentNodeInfo(brickInstanceId),
  );

  const {
    data: previewInfo,
    isLoading: isPreviewInfoLoading,
    error: previewInfoError,
  } = usePreviewInfo(brickConfig.id);

  useEffect(() => {
    if (previewInfoError) {
      dispatch(
        previewSlice.actions.setError({
          error: {
            name: "BlockRegistryError",
            message: `Error loading brick from registry\n${getErrorMessage(
              previewInfoError,
            )}`,
          },
        }),
      );
    }
  }, [previewInfoError]);

  const traceRecord = useSelector(
    selectActiveModComponentTraceForBrick(brickInstanceId),
  );
  const { data: serviceContext, isLoading: isLoadingServiceContext } =
    useAsyncState(
      makeIntegrationsContextFromDependencies(integrationDependencies),
      [integrationDependencies],
    );
  const context = {
    ...traceRecord?.templateContext,
    ...serviceContext,
  } as BrickArgsContext;

  // This defaults to "inherit" as described in the doc, see BrickConfig.rootMode
  const blockRootMode = brickConfig.rootMode ?? "inherit";
  const shouldUseStarterBrickRoot =
    previewInfo?.isRootAware &&
    blockRootMode === "inherit" &&
    isTriggerStarterBrick(starterBrick);

  const parentNodeInfo = useSelector(selectParentNodeInfo(brickInstanceId));

  // Assume the parent is a temp display brick for now
  const titleField = parentNodeInfo?.blockConfig?.config?.title ?? "";
  const titleValue = isExpression(titleField)
    ? titleField.__value__
    : titleField;
  const title = (titleValue as string) + " (preview)";

  const debouncedRun = useDebouncedCallback(
    async () => {
      if (isLoadingServiceContext || isPreviewInfoLoading) {
        return;
      }

      dispatch(previewSlice.actions.startPreview());

      // If the block is configured to inherit the root element, and the
      // starter brick is a trigger, try to get the root element from the
      // starter brick.
      // Note: this is not possible when starter brick's targetMode equals
      // "targetElement"; in this case a special message will be shown instead
      // of the brick output (see the code later in the component)
      const rootSelector =
        shouldUseStarterBrickRoot &&
        starterBrick.definition.targetMode === "root"
          ? starterBrick.definition.rootSelector
          : undefined;

      // `panel` was the default before we added the location field
      const location: Location =
        (parentNodeInfo?.blockConfig.config.location as Location) ?? "panel";

      try {
        await runRendererBrick(inspectedTab, {
          runId: traceRecord.runId,
          title,
          componentRef: {
            extensionId: modComponentId,
            blueprintId: mod?.id,
          },
          args: {
            apiVersion,
            blockConfig: {
              ...removeEmptyValues(brickConfig),
              if: undefined,
            },
            context,
            rootSelector,
          },
          location,
        });
        dispatch(previewSlice.actions.setSuccess({ output: {} }));
      } catch (error) {
        dispatch(previewSlice.actions.setError({ error }));
      }
    },
    300,
    { trailing: false, leading: true },
  );

  return {
    ...state,
    runBlockPreview() {
      void debouncedRun();
    },
  };
}
