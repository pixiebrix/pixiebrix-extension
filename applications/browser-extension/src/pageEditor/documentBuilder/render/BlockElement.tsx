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

import React, { useContext } from "react";
import { type BrickPipeline } from "@/bricks/types";
import { getErrorMessage } from "@/errors/errorHelpers";
import DocumentContext from "@/pageEditor/documentBuilder/render/DocumentContext";
import { runRendererPipeline } from "@/contentScript/messenger/api";
import { uuidv4 } from "@/types/helpers";
import PanelBody from "@/sidebar/PanelBody";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { serializeError } from "serialize-error";
import { type DynamicPath } from "@/pageEditor/documentBuilder/documentBuilderTypes";
import { mapPathToTraceBranches } from "@/pageEditor/documentBuilder/utils";
import { getConnectedTarget } from "@/sidebar/connectedTarget";
import { type PanelContext } from "@/types/sidebarTypes";
import { type RendererRunPayload } from "@/types/rendererTypes";
import useAsyncState from "@/hooks/useAsyncState";
import { mapModComponentRefToMessageContext } from "@/utils/modUtils";

type BlockElementProps = {
  pipeline: BrickPipeline;
  tracePath: DynamicPath;
};

/**
 * A React component that messages the contentScript to run a pipeline and then displays the result
 */
const BlockElement: React.FC<BlockElementProps> = ({ pipeline, tracePath }) => {
  const {
    options: { ctxt, logger, meta },
    onAction,
  } = useContext(DocumentContext);

  // Logger context will have both modComponentId and modId because they're passed from the containing PanelBody
  const panelContext = {
    ...logger.context,
    ...mapModComponentRefToMessageContext(meta.modComponentRef),
  } satisfies PanelContext;

  const {
    data: payload,
    isLoading,
    error,
  } = useAsyncState<RendererRunPayload>(async () => {
    // We currently only support associating the sidebar with the content script in the top-level frame (frameId: 0)
    const topLevelFrame = await getConnectedTarget();

    return runRendererPipeline(topLevelFrame, {
      nonce: uuidv4(),
      context: ctxt,
      pipeline,
      meta: {
        ...meta,
        // The pipeline is static, so don't need to maintain run counter on branches
        branches: [...meta.branches, ...mapPathToTraceBranches(tracePath)],
      },
      // TODO: pass runtime version via DocumentContext instead of hard-coding it. This will break for v4+
      options: apiVersionOptions("v3"),
      messageContext: logger.context,
    });
  }, [pipeline]);

  if (isLoading) {
    return (
      <PanelBody
        payload={null}
        context={panelContext}
        tracePath={tracePath}
        onAction={onAction}
      />
    );
  }

  if (error) {
    return (
      <PanelBody
        context={panelContext}
        onAction={onAction}
        tracePath={tracePath}
        payload={{
          key: `error-${getErrorMessage(error)}`,
          error: serializeError(error),
          ...meta,
        }}
      />
    );
  }

  return (
    <PanelBody
      context={panelContext}
      payload={payload ?? null}
      tracePath={tracePath}
      onAction={onAction}
    />
  );
};

export default BlockElement;
