import { BlockPipeline } from "@/blocks/types";
import { FormikErrorTree } from "@/pageEditor/tabs/editTab/editTabTypes";
import { TypedBlockMap } from "@/blocks/registry";
import { ExtensionPointType } from "@/extensionPoints/types";

export const MULTIPLE_RENDERERS_ERROR_MESSAGE =
  "A panel can only have one renderer. There are one or more renderers configured after this brick.";
export const RENDERER_MUST_BE_LAST_BLOCK_ERROR_MESSAGE =
  "A renderer must be the last brick.";
function validateRenderers(
  pipelineErrors: FormikErrorTree,
  pipeline: BlockPipeline,
  allBlocks: TypedBlockMap,
  extensionPointType: ExtensionPointType
) {
  if (extensionPointType !== "actionPanel" && extensionPointType !== "panel") {
    return;
  }

  let hasRenderer = false;
  for (let blockIndex = pipeline.length - 1; blockIndex >= 0; --blockIndex) {
    // eslint-disable-next-line security/detect-object-injection
    const pipelineBlock = pipeline[blockIndex];
    const blockType = allBlocks.get(pipelineBlock.id)?.type;
    const blockErrors = [];

    if (blockType !== "renderer") {
      continue;
    }

    if (hasRenderer) {
      blockErrors.push(MULTIPLE_RENDERERS_ERROR_MESSAGE);
    } else {
      hasRenderer = true;
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
