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

import React, { useEffect, useReducer } from "react";
import { BlockConfig } from "@/blocks/types";
import { AsyncState, useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import { useDebouncedCallback } from "use-debounce";
import { Button } from "react-bootstrap";
import Loader from "@/components/Loader";
import { getErrorMessage } from "@/errors";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExclamationTriangle,
  faInfoCircle,
  faSync,
} from "@fortawesome/free-solid-svg-icons";
import objectHash from "object-hash";
import JsonTree from "@/components/jsonTree/JsonTree";
import { isEmpty } from "lodash";
import { TraceRecord } from "@/telemetry/trace";
import { removeEmptyValues } from "@/pageEditor/extensionPoints/base";
import {
  ApiVersion,
  BlockArgContext,
  IBlock,
  RegistryId,
  ServiceDependency,
} from "@/core";
import { runBlock } from "@/contentScript/messenger/api";
import { thisTab } from "@/pageEditor/utils";
import { useField } from "formik";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import useDataPanelTabSearchQuery from "@/pageEditor/tabs/editTab/dataPanel/useDataPanelTabSearchQuery";
import { makeServiceContext } from "@/services/serviceUtils";
import getType from "@/runtime/getType";
import { BlockType } from "@/runtime/runtimeTypes";
import { BaseExtensionPointState } from "@/pageEditor/extensionPoints/elementConfig";
import { TriggerExtensionPointState } from "@/pageEditor/extensionPoints/formStateTypes";

/**
 * Bricks to preview even if there's no trace.
 */
const HACK_TRACE_OPTIONAL = new Set([
  "@pixiebrix/component-reader",
  "@pixiebrix/jquery-reader",
]);

function isTraceOptional(
  blockId: RegistryId,
  { type }: { type: BlockType }
): boolean {
  return type === "reader" || HACK_TRACE_OPTIONAL.has(blockId);
}

function isTriggerExtensionPoint(
  extensionPoint: BaseExtensionPointState
): extensionPoint is TriggerExtensionPointState {
  return extensionPoint.definition.type === "trigger";
}

type PreviewInfo = {
  block: IBlock;
  type: BlockType;
  isPure: boolean;
  traceOptional: boolean;
};

/**
 * Return metadata about preview requirements for a block.
 */
export function usePreviewInfo(blockId: RegistryId): AsyncState<PreviewInfo> {
  return useAsyncState(async () => {
    const block = await blockRegistry.lookup(blockId);
    const type = await getType(block);
    return {
      block,
      isPure: await block.isPure(),
      type,
      traceOptional: isTraceOptional(blockId, { type }),
    };
  }, [blockId]);
}

const traceWarning = (
  // The text-warning font color is brutal. This is more of a warning, but this color/style will have to do for now
  <div className="text-info mb-2">
    <FontAwesomeIcon icon={faExclamationTriangle} />
    &nbsp; No trace available. The actual output will differ from the preview if
    the configuration uses templates/variables
  </div>
);

type PreviewState = {
  isRunning: boolean;
  output: unknown | undefined;
  outputKey: string;
};

const initialState: PreviewState = {
  isRunning: false,
  output: undefined,
  outputKey: null,
};

const previewSlice = createSlice({
  name: "previewSlice",
  initialState,
  reducers: {
    startRun(state) {
      state.isRunning = true;
    },
    setSuccess(
      state,
      action: PayloadAction<{ output: unknown; outputKey: string }>
    ) {
      const { output, outputKey } = action.payload;
      state.outputKey = outputKey;
      state.output = outputKey ? { [`@${outputKey}`]: output } : output;
      state.isRunning = false;
    },
    setError(state, action: PayloadAction<{ error: unknown }>) {
      const { error } = action.payload;
      state.output = error;
      state.outputKey = null;
      state.isRunning = false;
    },
  },
});

const BlockPreview: React.FunctionComponent<{
  blockConfig: BlockConfig;
  extensionPoint: BaseExtensionPointState;
  traceRecord: TraceRecord;
  previewRefreshMillis?: 250;
  // eslint-disable-next-line complexity
}> = ({ blockConfig, extensionPoint, traceRecord, previewRefreshMillis }) => {
  const [{ isRunning, output, outputKey }, dispatch] = useReducer(
    previewSlice.reducer,
    {
      ...initialState,
      outputKey: blockConfig.outputKey,
    }
  );

  const [{ value: apiVersion }] = useField<ApiVersion>("apiVersion");
  const [{ value: services }] = useField<ServiceDependency[]>("services");

  const [blockInfo, blockLoading, blockError] = usePreviewInfo(blockConfig.id);

  // This defaults to "inherit" as described in the doc, see BlockConfig.rootMode
  const blockRootMode = blockConfig.rootMode ?? "inherit";

  const debouncedRun = useDebouncedCallback(
    async (blockConfig: BlockConfig, context: BlockArgContext) => {
      dispatch(previewSlice.actions.startRun());
      const { outputKey } = blockConfig;

      // If the block is configured to inherit the root element
      // and the extension point is a trigger,
      // try to get the root element from the extension point
      // Note: this is not possible when extensionPoint's targetMode equals "targetElement",
      // in this case a special message will be shown instead of the brick output (see the code later in the component)
      const rootSelector =
        blockRootMode === "inherit" &&
        isTriggerExtensionPoint(extensionPoint) &&
        extensionPoint.definition.targetMode === "root"
          ? extensionPoint.definition.rootSelector
          : undefined;
      try {
        const output = await runBlock(thisTab, {
          apiVersion,
          blockConfig: removeEmptyValues(blockConfig),
          context: { ...context, ...(await makeServiceContext(services)) },
          rootSelector,
        });
        dispatch(previewSlice.actions.setSuccess({ output, outputKey }));
      } catch (error) {
        dispatch(previewSlice.actions.setError({ error }));
      }
    },
    previewRefreshMillis,
    { trailing: true, leading: false }
  );

  const context = traceRecord?.templateContext;

  const showTraceWarning = !traceRecord && blockInfo?.traceOptional;

  useEffect(() => {
    if ((context && blockInfo?.isPure) || blockInfo?.traceOptional) {
      void debouncedRun(blockConfig, context as unknown as BlockArgContext);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- using objectHash for context
  }, [debouncedRun, blockConfig, blockInfo, objectHash(context ?? {})]);

  const [previewQuery, setPreviewQuery] = useDataPanelTabSearchQuery("preview");

  if (blockInfo?.type === "renderer") {
    return (
      <div className="text-muted">
        Output previews are not currently supported for renderers
      </div>
    );
  }

  if (
    blockRootMode === "inherit" &&
    isTriggerExtensionPoint(extensionPoint) &&
    extensionPoint.definition.targetMode !== "root"
  ) {
    return (
      <div className="text-muted">
        Output Preview is not supported because this brick&apos;s Root Mode is
        &quot;Inherit&quot; and the Trigger&apos;s Target Mode is &quot;Event
        Target&quot;. Run the Trigger to see the output on the Output tab.
      </div>
    );
  }

  if (blockError) {
    return (
      <div className="text-danger">
        Error loading brick from registry
        {getErrorMessage(blockError)}
      </div>
    );
  }

  if (blockLoading || isRunning) {
    return (
      <div>
        {showTraceWarning && traceWarning}
        <Loader />
      </div>
    );
  }

  if (!blockInfo?.traceOptional && !traceRecord) {
    return (
      <div className="text-info">
        <FontAwesomeIcon icon={faInfoCircle} /> Run the brick once to enable
        output preview
      </div>
    );
  }

  const isError = output instanceof Error;

  return (
    <div>
      {showTraceWarning && traceWarning}

      {blockInfo != null && !blockInfo.isPure && (
        <Button
          variant="info"
          size="sm"
          disabled={!traceRecord}
          onClick={() => {
            void debouncedRun(blockConfig, context as BlockArgContext);
          }}
        >
          <FontAwesomeIcon icon={faSync} /> Refresh Preview
        </Button>
      )}

      {output && !isError && !isEmpty(output) && (
        <JsonTree
          data={output}
          searchable
          copyable
          initialSearchQuery={previewQuery}
          onSearchQueryChanged={setPreviewQuery}
          shouldExpandNode={(keyPath) =>
            keyPath.length === 1 && keyPath[0] === `@${outputKey}`
          }
        />
      )}

      {output && !isError && isEmpty(output) && (
        <div>Brick produced empty output</div>
      )}

      {output && isError && (
        <div className="text-danger">{getErrorMessage(output)}</div>
      )}
    </div>
  );
};

export default BlockPreview;
