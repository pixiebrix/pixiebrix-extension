/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { AbsolutePosition } from "@/analysis/analysisTypes";
import { BlockConfig } from "@/blocks/types";
import { joinPathParts } from "@/utils";
import { Expression, Schema } from "@/core";
import blockRegistry, { TypedBlock } from "@/blocks/registry";
import { isExpression, isPipelineExpression } from "@/runtime/mapArgs";
import { JsonValue } from "type-fest";
import { DocumentRenderer } from "@/blocks/renderers/document";
import { getDocumentPipelinePaths } from "@/pageEditor/utils";
import { get } from "lodash";
import {
  getRootPipelineFlavor,
  getSubPipelineFlavor,
} from "@/pageEditor/tabs/editTab/blockFilterHelpers";
import { ExtensionPointType } from "@/extensionPoints/types";
import { PipelineFlavor } from "@/pageEditor/pageEditorTypes";

export function nestedPosition(
  position: AbsolutePosition,
  ...rest: string[]
): AbsolutePosition {
  return {
    path: joinPathParts(position.path, ...rest),
  };
}

export type VisitBlockExtra = {
  index: number;
  pipelineFlavor: PipelineFlavor;
};
export type VisitResolvedBlockExtra = VisitBlockExtra & {
  typedBlock: TypedBlock;
};
export type VisitPipelineExtra = {
  flavor: PipelineFlavor;
};
export type VisitRootPipelineExtra = {
  extensionPointType: ExtensionPointType;
};

/**
 * A base class for traversing a block pipeline.
 *
 * TODO: add pre- visit hook from traversePipeline
 * https://github.com/pixiebrix/pixiebrix-extension/blob/1aa42d7ef1f6652e3a3340e0138122d6ceb29378/src/pageEditor/utils.ts#L182-L182
 */
class PipelineVisitor {
  /**
   * Visit a configured block.
   * @param position the position in the extension
   * @param blockConfig the block configuration
   * @param index the index in the pipeline
   */
  public async visitBlock(
    position: AbsolutePosition,
    blockConfig: BlockConfig,
    extra: VisitBlockExtra
  ): Promise<void> {
    try {
      const typedBlock = await blockRegistry.lookupTyped(blockConfig.id);
      await this.visitResolvedBlock(position, blockConfig, {
        ...extra,
        typedBlock,
      });
    } catch (error) {
      console.debug("Error visiting block", error);
    }
  }

  /**
   * Visit a block that's configuration corresponds to a block defined in the registry
   */
  protected async visitResolvedBlock(
    position: AbsolutePosition,
    blockConfig: BlockConfig,
    { typedBlock }: VisitResolvedBlockExtra
  ): Promise<void> {
    if (blockConfig.id === DocumentRenderer.BLOCK_ID) {
      await this.visitRenderDocument(position, blockConfig);
      return;
    }

    const { inputSchema } = typedBlock.block;
    for await (const [prop, value] of Object.entries(blockConfig.config)) {
      if (isPipelineExpression(value)) {
        const pipelinePosition = nestedPosition(
          position,
          "config",
          prop,
          "__value__"
        );
        const pipelineFlavor = getSubPipelineFlavor(
          blockConfig.id,
          pipelinePosition.path
        );
        await this.visitPipeline(pipelinePosition, value.__value__, {
          flavor: pipelineFlavor,
        });
      } else if (isExpression(value)) {
        // eslint-disable-next-line security/detect-object-injection -- from parsed YAML or page editor
        const fieldSchema = inputSchema.properties?.[prop];

        // TODO:
        // 1. Handle missing fieldSchema
        // 2. Handle anyOf/oneOf/allOf
        await this.visitExpression(
          nestedPosition(position, "config", prop),
          value,
          {
            fieldSchema:
              typeof fieldSchema === "boolean" ? undefined : fieldSchema,
          }
        );
      } else {
        // eslint-disable-next-line security/detect-object-injection -- from parsed YAML or page editor
        const fieldSchema = inputSchema.properties?.[prop];

        // TODO:
        // 1. Handle missing fieldSchema
        // 2. Handle anyOf/oneOf/allOf
        await this.visitLiteral(
          nestedPosition(position, "config", prop),
          value as JsonValue,
          {
            fieldSchema:
              typeof fieldSchema === "boolean" ? undefined : fieldSchema,
          }
        );
      }
    }
  }

  public async visitRenderDocument(
    position: AbsolutePosition,
    blockConfig: BlockConfig
  ): Promise<void> {
    const subPipelineProperties = getDocumentPipelinePaths(blockConfig);
    for await (const subPipelineProperty of subPipelineProperties) {
      const subPipelineAccessor = joinPathParts(
        subPipelineProperty,
        "__value__"
      );

      const subPipeline = get(blockConfig, subPipelineAccessor);
      if (subPipeline?.length > 0) {
        const pipelinePosition = nestedPosition(position, subPipelineAccessor);
        const pipelineFlavor = getSubPipelineFlavor(
          blockConfig.id,
          pipelinePosition.path
        );
        await this.visitPipeline(pipelinePosition, subPipeline, {
          flavor: pipelineFlavor,
        });
      }
    }
  }

  public async visitExpression(
    position: AbsolutePosition,
    expression: Expression<unknown>,
    { fieldSchema }: { fieldSchema: Schema }
  ): Promise<void> {
    // NOP
  }

  public async visitLiteral(
    position: AbsolutePosition,
    value: JsonValue,
    { fieldSchema }: { fieldSchema: Schema }
  ): Promise<void> {
    // NOP
  }

  public async visitPipeline(
    position: AbsolutePosition,
    pipeline: BlockConfig[],
    { flavor }: VisitPipelineExtra
  ): Promise<void> {
    for await (const [index, blockConfig] of pipeline.entries()) {
      await this.visitBlock(
        nestedPosition(position, String(index)),
        blockConfig,
        {
          index,
          pipelineFlavor: flavor,
        }
      );
    }
  }

  public async visitRootPipeline(
    pipeline: BlockConfig[],
    { extensionPointType }: VisitRootPipelineExtra
  ): Promise<void> {
    const flavor = getRootPipelineFlavor(extensionPointType);
    await this.visitPipeline({ path: "" }, pipeline, { flavor });
  }
}

export default PipelineVisitor;
