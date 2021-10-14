import { BlockPipeline } from "@/blocks/types";
import {
  BlocksMap,
  FormikErrorTree,
} from "@/devTools/editor/tabs/editTab/editTabTypes";
import { ElementType } from "@/devTools/editor/extensionPoints/elementConfig";

export const MULTIPLE_RENDERERS_ERROR_MESSAGE =
  "Pipeline can have only one renderer. There is another renderer defined later in the pipeline.";
export const RENDERER_MUST_BE_LAST_BLOCK_ERROR_MESSAGE =
  "Renderer must be placed in the very end of the pipeline.";
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
  for (let blockIndex = pipeline.length - 1; blockIndex >= 0; --blockIndex) {
    // eslint-disable-next-line security/detect-object-injection
    const pipelineBlock = pipeline[blockIndex];
    const blockType = allBlocks[pipelineBlock.id]?.type;
    const blockErrors = [];

    if (blockType !== "renderer") {
      continue;
    }

    if (hasGotRenderer) {
      blockErrors.push(MULTIPLE_RENDERERS_ERROR_MESSAGE);
    } else {
      hasGotRenderer = true;
    }

    if (blockIndex !== pipeline.length - 1) {
      blockErrors.push(RENDERER_MUST_BE_LAST_BLOCK_ERROR_MESSAGE);
    }

    if (blockErrors.length > 0) {
      // eslint-disable-next-line security/detect-object-injection
      pipelineErrors[blockIndex] = blockErrors.join(" ");
    }
  }
}

export default validateRenderers;
