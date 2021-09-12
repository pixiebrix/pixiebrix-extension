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

import React, { useContext, useEffect, useState } from "react";
import { BlockConfig } from "@/blocks/types";
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import { runBlock } from "@/background/devtools";
import { useTrace } from "@/devTools/editor/tabs/effect/useTrace";
import { DevToolsContext } from "@/devTools/context";
import { useDebouncedCallback } from "use-debounce";
import { Button } from "react-bootstrap";
import GridLoader from "react-spinners/GridLoader";
import { getErrorMessage } from "@/errors";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle, faSync } from "@fortawesome/free-solid-svg-icons";
import useInterval from "@/hooks/useInterval";
import objectHash from "object-hash";
import JsonTree from "@/components/JsonTree";

const PreviewView: React.FunctionComponent<{
  blockConfig: BlockConfig;
  previewRefreshMillis?: 150;
  traceReloadMillis?: 300;
}> = ({ blockConfig, previewRefreshMillis, traceReloadMillis }) => {
  const { port } = useContext(DevToolsContext);

  const [output, setOutput] = useState<unknown | undefined>();

  const [blockInfo, blockLoading, blockError] = useAsyncState(async () => {
    const block = await blockRegistry.lookup(blockConfig.id);
    return {
      block,
      isPure: await block.isPure(),
    };
  }, [blockConfig.id]);

  const traceInfo = useTrace(blockConfig.instanceId);

  const debouncedRun = useDebouncedCallback(
    async (blockConfig: BlockConfig, args: Record<string, unknown>) => {
      try {
        const result = await runBlock(port, { blockConfig, args });
        setOutput(result);
      } catch (error: unknown) {
        setOutput(error);
      }
    },
    previewRefreshMillis,
    { trailing: true, leading: false }
  );

  const context = traceInfo.record?.templateContext;

  useInterval(traceInfo.recalculate, traceReloadMillis);

  useEffect(() => {
    if (context && blockInfo?.isPure) {
      void debouncedRun(blockConfig, context);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- using objectHash for context
  }, [debouncedRun, blockConfig, blockInfo?.isPure, objectHash(context ?? {})]);

  if (blockLoading || traceInfo.isLoading) {
    return (
      <div>
        <GridLoader />
      </div>
    );
  }

  if (blockError || traceInfo.error) {
    return (
      <div className="text-danger">
        Error loading brick or trace:{" "}
        {getErrorMessage(blockError ?? traceInfo.error)}
      </div>
    );
  }

  if (!traceInfo.record) {
    return (
      <div className="text-info">
        <FontAwesomeIcon icon={faInfoCircle} /> Run the brick once to enable
        output preview
      </div>
    );
  }

  return (
    <div>
      {blockInfo != null && !blockInfo.isPure && (
        <Button
          variant="info"
          size="sm"
          disabled={!traceInfo.record}
          onClick={() => {
            void debouncedRun(blockConfig, context);
          }}
        >
          <FontAwesomeIcon icon={faSync} /> Refresh
        </Button>
      )}

      {output && !(output instanceof Error) && <JsonTree data={output} />}

      {output && output instanceof Error && (
        <div className="text-danger">{getErrorMessage(output)}</div>
      )}
    </div>
  );
};

export default PreviewView;
