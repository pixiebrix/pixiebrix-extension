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
