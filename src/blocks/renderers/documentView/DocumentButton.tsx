import React, { useCallback, useContext } from "react";
import { BlockPipeline } from "@/blocks/types";
import AsyncButton, { AsyncButtonProps } from "@/components/AsyncButton";
import { whoAmI } from "@/background/messenger/api";
import { runEffectPipeline } from "@/contentScript/messenger/api";
import { uuidv4 } from "@/types/helpers";
import { BlockArgContext } from "@/core";
import InnerComponentContext from "@/blocks/renderers/documentView/InnerComponentContext";
import { Except } from "type-fest";

type DocumentButtonProps = Except<AsyncButtonProps, "onClick"> & {
  onClick: BlockPipeline;
};

const DocumentButton: React.FC<DocumentButtonProps> = ({
  onClick,
  ...restProps
}) => {
  const context = useContext(InnerComponentContext);

  const handler = useCallback(async () => {
    const me = await whoAmI();
    // We currently only support associating the sidebar with the content script in the top-level frame (frameId: 0)
    return runEffectPipeline(
      { tabId: me.tab.id, frameId: 0 },
      {
        nonce: uuidv4(),
        context: (context.options.ctxt as unknown) as BlockArgContext,
        pipeline: onClick,
      }
    );
  }, [onClick, context]);

  return <AsyncButton onClick={handler} {...restProps} />;
};

export default DocumentButton;
