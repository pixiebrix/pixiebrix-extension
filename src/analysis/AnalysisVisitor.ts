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
import { joinName } from "@/utils";
import { Expression, IBlock, Schema } from "@/core";
import blockRegistry from "@/blocks/registry";
import { isExpression, isPipelineExpression } from "@/runtime/mapArgs";
import { JsonValue } from "type-fest";
import { DocumentRenderer } from "@/blocks/renderers/document";

function nestedPosition(
  position: AbsolutePosition,
  relativePath: string
): AbsolutePosition {
  return {
    path: joinName(position.path, relativePath),
  };
}

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
    { index }: { index: number }
  ): Promise<void> {
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
    if (blockConfig.id === DocumentRenderer.BLOCK_ID) {
      await this.visitRenderDocument(position, blockConfig);
      return;
    }

    for (const [prop, value] of Object.entries(blockConfig.config)) {
      if (isPipelineExpression(value)) {
        // TODO: pass pipeline type restrictions
        // eslint-disable-next-line no-await-in-loop -- run synchronously for now
        await this.visitPipeline(
          nestedPosition(position, prop),
          value.__value__
        );
      } else if (isExpression(value)) {
        // eslint-disable-next-line security/detect-object-injection -- from parsed YAML or page editor
        const fieldSchema = block.inputSchema.properties?.[prop];
        // eslint-disable-next-line no-await-in-loop -- run synchronously for now
        await this.visitExpression(nestedPosition(position, prop), value, {
          fieldSchema:
            typeof fieldSchema === "boolean" ? undefined : fieldSchema,
        });
      } else {
        // eslint-disable-next-line security/detect-object-injection -- from parsed YAML or page editor
        const fieldSchema = block.inputSchema.properties?.[prop];
        // eslint-disable-next-line no-await-in-loop -- running synchronously for now
        await this.visitLiteral(
          nestedPosition(position, prop),
          value as JsonValue,
          {
            fieldSchema:
              typeof fieldSchema === "boolean" ? undefined : fieldSchema,
          }
        );
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclass will override
  public async visitRenderDocument(
    position: AbsolutePosition,
    blockConfig: BlockConfig
  ): Promise<void> {
    // TODO: implement the logic from traversePipeline
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
    for (const [index, block] of pipeline.entries()) {
      // eslint-disable-next-line no-await-in-loop -- run synchronously for now
      await this.visitBlock(nestedPosition(position, String(index)), block, {
        index,
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclass will override
  public async visitRootPipeline(
    position: AbsolutePosition,
    pipeline: BlockConfig[],
    { extensionType }: { extensionType: string }
  ): Promise<void> {
    await this.visitPipeline(position, pipeline);
  }
}

export default AnalysisVisitor;
