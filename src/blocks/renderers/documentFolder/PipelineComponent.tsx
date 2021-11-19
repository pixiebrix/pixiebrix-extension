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

import React, { useContext } from "react";
import { BlockPipeline } from "@/blocks/types";
import { useAsyncState } from "@/hooks/common";
import { BlockArgContext } from "@/core";
import { getErrorMessage } from "@/errors";
import InnerComponentContext from "@/blocks/renderers/documentFolder/InnerComponentContext";
import { runRendererPipeline } from "@/contentScript/messenger/api";
import { whoAmI } from "@/background/messenger/api";
import { uuidv4 } from "@/types/helpers";
import PanelBody from "@/actionPanel/PanelBody";
import { RendererPayload } from "@/runtime/runtimeTypes";

/**
 * A React component that messages the contentScript to run a pipeline and then shows the result
 */
const PipelineComponent: React.FC<{ pipeline: BlockPipeline }> = ({
  pipeline,
}) => {
  const context = useContext(InnerComponentContext);

  const [
    payload,
    isLoading,
    error,
  ] = useAsyncState<RendererPayload>(async () => {
    const me = await whoAmI();
    // We currently only support associating the sidebar with the content script in the top-level frame (frameId: 0)
    return runRendererPipeline(
      { tabId: me.tab.id, frameId: 0 },
      {
        nonce: uuidv4(),
        context: (context.options.ctxt as unknown) as BlockArgContext,
        pipeline,
      }
    );
  }, [pipeline]);

  if (isLoading) {
    return <PanelBody payload={null} />;
  }

  if (error) {
    return (
      <PanelBody
        payload={{
          key: `error-${getErrorMessage(error)}`,
          error: getErrorMessage(error),
        }}
      />
    );
  }

  return <PanelBody payload={payload} />;
};

export default PipelineComponent;
