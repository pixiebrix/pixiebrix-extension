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
import { joinName, joinPathParts } from "@/utils";
import { Expression, IBlock, Schema } from "@/core";
import blockRegistry from "@/blocks/registry";
import { isExpression, isPipelineExpression } from "@/runtime/mapArgs";
import { JsonValue } from "type-fest";
import { DocumentRenderer } from "@/blocks/renderers/document";
import { getDocumentPipelinePaths } from "@/pageEditor/utils";
import { get } from "lodash";

export function nestedPosition(
  position: AbsolutePosition,
  ...rest: string[]
): AbsolutePosition {
  return {
    path: joinName(position.path, ...rest),
  };
}

export type VisitBlockExtra = {
  index: number;
};

/**
 * A base class for creating analysis visitors.
 *
 * TODO: add pre- visit hook from traversePipeline
 * https://github.com/pixiebrix/pixiebrix-extension/blob/1aa42d7ef1f6652e3a3340e0138122d6ceb29378/src/pageEditor/utils.ts#L182-L182
 */
abstract class AnalysisVisitor {
  /**
   * Visit a configured block.
   * @param position the position in the extension
   * @param blockConfig the block configuration
   * @param index the index in the pipeline
   */
  public async visitBlock(
    position: AbsolutePosition,
    blockConfig: BlockConfig,
    { index }: VisitBlockExtra
  ): Promise<void> {
    console.log("Visiting block", blockConfig);
    try {
      const block = await blockRegistry.lookup(blockConfig.id);
      await this.visitResolvedBlock(position, blockConfig, { index, block });
    } catch (error) {
      console.debug("Error visiting block", error);
    }
  }

  /**
   * Visit a block that's configuration corresponds to a block defined in the registry
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclass will override
  protected async visitResolvedBlock(
    position: AbsolutePosition,
    blockConfig: BlockConfig,
    { index, block }: { index: number; block: IBlock }
  ): Promise<void> {
    console.log("Visiting resolved block", blockConfig);
    if (blockConfig.id === DocumentRenderer.BLOCK_ID) {
      await this.visitRenderDocument(position, blockConfig);
      return;
    }

    for await (const [prop, value] of Object.entries(blockConfig.config)) {
      if (isPipelineExpression(value)) {
        // TODO: pass pipeline type restrictions
        await this.visitPipeline(
          nestedPosition(position, "config", prop, "__value__"),
          value.__value__
        );
      } else if (isExpression(value)) {
        // eslint-disable-next-line security/detect-object-injection -- from parsed YAML or page editor
        const fieldSchema = block.inputSchema.properties?.[prop];
        await this.visitExpression(
          nestedPosition(position, "config", prop, "__value__"),
          value,
          {
            fieldSchema:
              typeof fieldSchema === "boolean" ? undefined : fieldSchema,
          }
        );
      } else {
        // eslint-disable-next-line security/detect-object-injection -- from parsed YAML or page editor
        const fieldSchema = block.inputSchema.properties?.[prop];
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
      console.log("Document pipeline", subPipeline);
      if (subPipeline?.length > 0) {
        await this.visitPipeline(
          {
            path: joinPathParts(position.path, subPipelineAccessor),
          },
          subPipeline
        );
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclass will override
  public async visitExpression(
    position: AbsolutePosition,
    expression: Expression<unknown>,
    { fieldSchema }: { fieldSchema: Schema }
  ): Promise<void> {
    // NOP
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclass will override
  public async visitLiteral(
    position: AbsolutePosition,
    value: JsonValue,
    { fieldSchema }: { fieldSchema: Schema }
  ): Promise<void> {
    // NOP
  }

  public async visitPipeline(
    position: AbsolutePosition,
    pipeline: BlockConfig[]
  ): Promise<void> {
    console.log("Visiting pipeline", pipeline);
    for await (const [index, blockConfig] of pipeline.entries()) {
      console.log("Will Visit pipeline block", {
        position: nestedPosition(position, String(index)),
        blockConfig,
        extra: {
          index,
        },
      });
      await this.visitBlock(
        nestedPosition(position, String(index)),
        blockConfig,
        {
          index,
        }
      );
    }
  }

  public async visitRootPipeline(
    pipeline: BlockConfig[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclass will override
    { extensionType }: { extensionType: string }
  ): Promise<void> {
    await this.visitPipeline({ path: "" }, pipeline);
  }
}

export default AnalysisVisitor;
