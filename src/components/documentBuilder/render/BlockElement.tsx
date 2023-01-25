/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { type BlockPipeline } from "@/blocks/types";
import { useAsyncState } from "@/hooks/common";
import { getErrorMessage } from "@/errors/errorHelpers";
import DocumentContext from "@/components/documentBuilder/render/DocumentContext";
import { runRendererPipeline } from "@/contentScript/messenger/api";
import { uuidv4 } from "@/types/helpers";
import PanelBody from "@/sidebar/PanelBody";
import { type RendererPayload } from "@/runtime/runtimeTypes";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { serializeError } from "serialize-error";
import { type DynamicPath } from "@/components/documentBuilder/documentBuilderTypes";
import { mapPathToTraceBranches } from "@/components/documentBuilder/utils";
import { getTopLevelFrame } from "webext-messenger";

type BlockElementProps = {
  pipeline: BlockPipeline;
  tracePath: DynamicPath;
};

/**
 * A React component that messages the contentScript to run a pipeline and then displays the result
 */
const BlockElement: React.FC<BlockElementProps> = ({ pipeline, tracePath }) => {
  const {
    meta,
    options: { ctxt, logger },
    onAction,
  } = useContext(DocumentContext);

  const [payload, isLoading, error] =
    useAsyncState<RendererPayload>(async () => {
      // We currently only support associating the sidebar with the content script in the top-level frame (frameId: 0)
      const topLevelFrame = await getTopLevelFrame();

      return runRendererPipeline(topLevelFrame, {
        nonce: uuidv4(),
        context: ctxt,
        pipeline,
        meta: {
          ...meta,
          // The pipeline is static, so don't need to maintain run counter on branches
          branches: mapPathToTraceBranches(tracePath),
        },
        // TODO: pass runtime version via DocumentContext instead of hard-coding it. This will break for v4+
        options: apiVersionOptions("v3"),
        messageContext: logger.context,
      });
    }, [pipeline]);

  if (isLoading) {
    return (
      <PanelBody payload={null} context={logger.context} onAction={onAction} />
    );
  }

  if (error) {
    return (
      <PanelBody
        context={logger.context}
        onAction={onAction}
        payload={{
          key: `error-${getErrorMessage(error)}`,
          error: serializeError(error),
          ...meta,
        }}
      />
    );
  }

  return (
    <PanelBody context={logger.context} payload={payload} onAction={onAction} />
  );
};

export default BlockElement;
