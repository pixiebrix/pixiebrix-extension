/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type BrickConfig, type BrickPosition } from "@/bricks/types";
import PipelineVisitor, {
  type VisitBlockExtra,
} from "@/bricks/PipelineVisitor";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import blockRegistry, { type TypedBlockMap } from "@/bricks/registry";
import { type Schema } from "@/types/schemaTypes";
import { compact } from "lodash";

export type ModVariableNameResult = {
  /**
   * Statically known mod variable names.
   */
  knownNames: string[];
};

/**
 * Visitor to collect all events fired by a single FormState.
 * @since 1.7.34
 */
class ModVariableNamesVisitor extends PipelineVisitor {
  readonly schemaPromises: Array<Promise<Schema>> = [];

  constructor(readonly allBlocks: TypedBlockMap) {
    super();
  }

  override visitBrick(
    position: BrickPosition,
    blockConfig: BrickConfig,
    extra: VisitBlockExtra
  ): void {
    super.visitBrick(position, blockConfig, extra);

    const { block } = this.allBlocks.get(blockConfig.id) ?? {};

    if (block?.getModVariableSchema) {
      this.schemaPromises.push(block.getModVariableSchema?.(blockConfig));
    }
  }

  static async collectNames(
    formStates: ModComponentFormState[]
  ): Promise<ModVariableNameResult> {
    const allBlocks = await blockRegistry.allTyped();
    const visitor = new ModVariableNamesVisitor(allBlocks);

    for (const formState of formStates) {
      visitor.visitRootPipeline(formState.extension.blockPipeline);
    }

    // Schema promises return undefined if not page state
    const schemas: Array<Schema | undefined> = await Promise.all(
      visitor.schemaPromises
    );

    const variableNames = new Set<string>();

    for (const schema of compact(schemas)) {
      for (const variableName of Object.keys(schema.properties ?? {})) {
        variableNames.add(variableName);
      }
    }

    return {
      knownNames: [...variableNames],
    };
  }
}

export default ModVariableNamesVisitor;
