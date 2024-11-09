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
import { type VisitBlockExtra } from "@/bricks/PipelineVisitor";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { type UUID } from "@/types/stringTypes";
import brickRegistry, { type TypedBrickMap } from "@/bricks/registry";
import PipelineExpressionVisitor, {
  type VisitDocumentBuilderElementArgs,
} from "@/bricks/PipelineExpressionVisitor";
import type { Expression } from "@/types/runtimeTypes";
import { isNunjucksExpression, isVarExpression } from "@/utils/expressionUtils";
import { assertNotNullish } from "@/utils/nullishUtils";
import type { Brick } from "@/types/brickTypes";

export type Location = {
  modComponentId: UUID;
  brick?: Brick;
  brickConfig: BrickConfig;
};

export type BrickItem = {
  location: Location;
  data: {
    brick: {
      id: string;
      name?: string;
    };
    label?: string;
    comments?: string;
  };
};

export type ExpressionItem = {
  location: Location;
  data: {
    value: string;
  };
};

export type IndexedItem = BrickItem | ExpressionItem;

export function isBrickItem(item: IndexedItem): item is BrickItem {
  return (item as BrickItem).data?.brick !== undefined;
}

export type SearchIndexResult = {
  items: IndexedItem[];
};

export type ContextStack = {
  brick: Brick | undefined;
  brickConfig: BrickConfig;
};

/**
 * Visitor to collect mod fragments for search within a mod.
 * @since 1.7.34
 */
class SearchIndexVisitor extends PipelineExpressionVisitor {
  readonly items: IndexedItem[] = [];

  readonly brickStack: ContextStack[] = [];

  constructor(
    readonly modComponentId: UUID,
    readonly allBricks: TypedBrickMap,
  ) {
    super();
  }

  override visitDocumentBuilderElement({
    position,
    blockConfig,
    documentBuilderElement,
    pathInBlock,
  }: VisitDocumentBuilderElementArgs) {}

  override visitExpression(
    _position: BrickPosition,
    expression: Expression<unknown>,
  ) {
    const frame = this.brickStack.at(-1);
    assertNotNullish(frame, "Expected expression to be within a brick");

    if (isVarExpression(expression) || isNunjucksExpression(expression)) {
      this.items.push({
        location: {
          modComponentId: this.modComponentId,
          brickConfig: frame.brickConfig,
          brick: frame.brick,
        },
        data: {
          value: expression.__value__,
        },
      });
    }
  }

  override visitBrick(
    position: BrickPosition,
    brickConfig: BrickConfig,
    extra: VisitBlockExtra,
  ): void {
    const { brick } = this.allBricks.get(brickConfig.id) ?? {};

    this.brickStack.push({
      brickConfig,
      brick,
    });

    super.visitBrick(position, brickConfig, extra);

    this.items.push({
      location: {
        modComponentId: this.modComponentId,
        brickConfig,
        brick,
      },
      data: {
        brick: {
          id: brickConfig.id,
          name: brick?.name,
        },
        label: brickConfig.label,
        comments: brickConfig.comments,
      },
    });

    this.brickStack.pop();
  }

  static async collectItems(
    formStates: ModComponentFormState[],
  ): Promise<SearchIndexResult> {
    const allBricks = await brickRegistry.allTyped();

    const items: IndexedItem[] = [];

    for (const formState of formStates) {
      const visitor = new SearchIndexVisitor(formState.uuid, allBricks);
      visitor.visitRootPipeline(formState.modComponent.brickPipeline);
      items.push(...visitor.items);
    }

    return {
      items,
    };
  }
}

export default SearchIndexVisitor;
