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
import { getErrorMessage } from "@/errors";
import DocumentContext from "@/components/documentBuilder/render/DocumentContext";
import { runMapArgs, runRendererPipeline } from "@/contentScript/messenger/api";
import { whoAmI } from "@/background/messenger/api";
import { uuidv4 } from "@/types/helpers";
import PanelBody from "@/actionPanel/PanelBody";
import { RendererPayload } from "@/runtime/runtimeTypes";
import apiVersionOptions from "@/runtime/apiVersionOptions";

type DocumentBlockProps = { pipeline: BlockPipeline };

/**
 * A React component that messages the contentScript to run a pipeline and then shows the result
 */
const DocumentBlock: React.FC<DocumentBlockProps> = ({ pipeline }) => {
  const {
    options: { ctxt },
  } = useContext(DocumentContext);

  const [
    payload,
    isLoading,
    error,
  ] = useAsyncState<RendererPayload>(async () => {
    const me = await whoAmI();
    const target = { tabId: me.tab.id, frameId: 0 };

    const resolvedPipeline = (await runMapArgs(
      target,
      // TODO: pass runtime version via DocumentContext instead of hardcoding it
      {
        config: pipeline,
        context: ctxt,
        options: apiVersionOptions("v3"),
      }
    )) as BlockPipeline;

    console.log({ resolvedPipeline });

    // We currently only support associating the sidebar with the content script in the top-level frame (frameId: 0)
    return runRendererPipeline(target, {
      nonce: uuidv4(),
      context: ctxt,
      pipeline: resolvedPipeline,
    });
  }, [pipeline]);

  console.log("DocumentBlock", {
    pipeline,
    ctxt,
    payload,
    error,
  });

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

export default DocumentBlock;
