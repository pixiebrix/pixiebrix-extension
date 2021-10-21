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

import React, { useEffect, useState } from "react";
import { BlockConfig } from "@/blocks/types";
import { AsyncState, useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import { useDebouncedCallback } from "use-debounce";
import { Button } from "react-bootstrap";
import GridLoader from "react-spinners/GridLoader";
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
import { BlockType, getType } from "@/blocks/util";
import { removeEmptyValues } from "@/devTools/editor/extensionPoints/base";
import { UnknownObject } from "@/types";
import { IBlock, RegistryId } from "@/core";
import { runBlock } from "@/contentScript/messenger/api";
import { thisTab } from "@/devTools/utils";
import useDataPanelTabSearchQuery from "@/devTools/editor/tabs/editTab/dataPanel/useDataPanelTabSearchQuery";

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

const BlockPreview: React.FunctionComponent<{
  traceRecord: TraceRecord;
  blockConfig: BlockConfig;
  previewRefreshMillis?: 250;
}> = ({ blockConfig, traceRecord, previewRefreshMillis }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<unknown | undefined>();
  const [outputKey, setOutputKey] = useState<string>(blockConfig.outputKey);

  const [blockInfo, blockLoading, blockError] = usePreviewInfo(blockConfig.id);

  const debouncedRun = useDebouncedCallback(
    async (blockConfig: BlockConfig, args: UnknownObject) => {
      setIsRunning(true);
      try {
        const result = await runBlock(thisTab, {
          blockConfig: removeEmptyValues(blockConfig),
          args,
        });
        const { outputKey } = blockConfig;
        setOutputKey(outputKey);
        setOutput(outputKey ? { [`@${outputKey}`]: result } : result);
      } catch (error: unknown) {
        setOutput(error);
      } finally {
        setIsRunning(false);
      }
    },
    previewRefreshMillis,
    { trailing: true, leading: false }
  );

  const context = traceRecord?.templateContext;

  const showTraceWarning = !traceRecord && blockInfo?.traceOptional;

  useEffect(() => {
    if ((context && blockInfo?.isPure) || blockInfo?.traceOptional) {
      void debouncedRun(blockConfig, context);
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
        <GridLoader />
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
            void debouncedRun(blockConfig, context);
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
