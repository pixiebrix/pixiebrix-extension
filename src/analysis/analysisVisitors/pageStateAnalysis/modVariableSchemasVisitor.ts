/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import blockRegistry, { type TypedBrickMap } from "@/bricks/registry";
import { type Schema } from "@/types/schemaTypes";
import { compact, isEqual, uniqWith } from "lodash";

export type ModVariableSchemaResult = {
  /**
   * Statically known mod variable schemas.
   */
  knownSchemas: Array<Schema["properties"]>;
};

/**
 * Visitor to collect all events fired by a single FormState.
 * @since 1.7.34
 */
class ModVariableSchemasVisitor extends PipelineVisitor {
  readonly schemaPromises: Array<Promise<Schema | undefined>> = [];

  constructor(readonly allBlocks: TypedBrickMap) {
    super();
  }

  override visitBrick(
    position: BrickPosition,
    blockConfig: BrickConfig,
    extra: VisitBlockExtra,
  ): void {
    super.visitBrick(position, blockConfig, extra);

    const { block } = this.allBlocks.get(blockConfig.id) ?? {};

    if (block?.getModVariableSchema) {
      this.schemaPromises.push(block.getModVariableSchema?.(blockConfig));
    }
  }

  static async collectSchemas(
    formStates: ModComponentFormState[],
  ): Promise<ModVariableSchemaResult> {
    const allBlocks = await blockRegistry.allTyped();
    const visitor = new ModVariableSchemasVisitor(allBlocks);

    for (const formState of formStates) {
      visitor.visitRootPipeline(formState.modComponent.brickPipeline);
    }

    // Schema promises return undefined if not page state
    const schemas: Array<Schema | undefined> = await Promise.all(
      visitor.schemaPromises,
    );

    const variableSchemas: Array<Schema["properties"]> = [];

    for (const schema of compact(schemas)) {
      variableSchemas.push(schema.properties ?? {});
    }

    return {
      knownSchemas: uniqWith<Schema["properties"]>(variableSchemas, isEqual),
    };
  }
}

export default ModVariableSchemasVisitor;
