import { BlockPipeline } from "@/blocks/types";
import {
  BlocksMap,
  FormikErrorTree,
} from "@/devTools/editor/tabs/editTab/editTabTypes";
import { ElementType } from "@/devTools/editor/extensionPoints/elementConfig";

function validateRenderers(
  pipelineErrors: FormikErrorTree,
  pipeline: BlockPipeline,
  allBlocks: BlocksMap,
  elementType: ElementType
) {
  if (elementType !== "actionPanel" && elementType !== "panel") {
    return;
  }

  let hasGotRenderer = false;
  for (let blockIndex = 0; blockIndex !== pipeline.length; ++blockIndex) {
    // eslint-disable-next-line security/detect-object-injection
    const pipelineBlock = pipeline[blockIndex];
    const blockType = allBlocks[pipelineBlock.id]?.type;

    if (blockType !== "renderer") {
      continue;
    }

    if (hasGotRenderer) {
      // eslint-disable-next-line security/detect-object-injection
      pipelineErrors[blockIndex] =
        "There is another renderer defined in the pipeline.";
    } else {
      hasGotRenderer = true;
    }
  }
}

export default validateRenderers;
