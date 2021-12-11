import React, { useCallback, useContext } from "react";
import { BlockPipeline } from "@/blocks/types";
import AsyncButton, { AsyncButtonProps } from "@/components/AsyncButton";
import { whoAmI } from "@/background/messenger/api";
import { runEffectPipeline } from "@/contentScript/messenger/api";
import { uuidv4 } from "@/types/helpers";
import DocumentContext from "@/components/documentBuilder/DocumentContext";
import { Except } from "type-fest";

type DocumentButtonProperties = Except<AsyncButtonProps, "onClick"> & {
  onClick: BlockPipeline;
};

const DocumentButton: React.FC<DocumentButtonProperties> = ({
  onClick,
  ...restProperties
}) => {
  const context = useContext(DocumentContext);

  const handler = useCallback(async () => {
    const me = await whoAmI();
    // We currently only support associating the sidebar with the content script in the top-level frame (frameId: 0)
    return runEffectPipeline(
      { tabId: me.tab.id, frameId: 0 },
      {
        nonce: uuidv4(),
        context: context.options.ctxt,
        pipeline: onClick,
      }
    );
  }, [onClick, context]);

  return <AsyncButton onClick={handler} {...restProperties} />;
};

export default DocumentButton;
