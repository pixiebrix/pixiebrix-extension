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
import {
  castTextLiteralOrThrow,
  isNunjucksExpression,
  isPipelineExpression,
  isVarExpression,
} from "@/utils/expressionUtils";
import { isNullOrBlank } from "@/utils/stringUtils";
import { flatten, isArray, omit } from "lodash";
import { isObject } from "@/utils/objectUtils";
import { isPrimitive } from "@/utils/typeUtils";
import { adapter } from "@/pageEditor/starterBricks/adapter";
import type {
  FieldRef,
  IndexedItem,
  LocationRef,
  ItemBreadcrumb,
} from "@/pageEditor/tabs/editTab/dataPanel/tabs/FindTab/findTypes";
import PipelineExpressionVisitor, {
  type VisitDocumentBuilderElementArgs,
} from "@/bricks/PipelineExpressionVisitor";

/**
 * Visitor to collect mod fragments for search within a mod.
 * @since 2.1.8
 */
class SearchIndexVisitor extends PipelineExpressionVisitor {
  readonly items: IndexedItem[] = [];

  readonly breadcrumbs: ItemBreadcrumb[] = [];

  constructor(
    readonly modComponentId: UUID,
    readonly allBricks: TypedBrickMap,
  ) {
    super();
  }

  getLocationRef(fieldRef: FieldRef) {
    return {
      modComponentId: this.modComponentId,
      breadcrumbs: [...this.breadcrumbs],
      fieldRef,
    };
  }

  /**
   * Recursively visit values within a brick configuration field.
   *
   * Currently, all value items are associated with the top-level brick configuration field.
   */
  visitFieldValue(value: unknown, fieldRef: FieldRef): void {
    if (isPrimitive(value) && value != null) {
      this.items.push({
        location: this.getLocationRef(fieldRef),
        data: {
          value: String(value),
        },
      });

      return;
    }

    try {
      const literal = castTextLiteralOrThrow(value);
      if (literal != null) {
        this.items.push({
          location: this.getLocationRef(fieldRef),
          data: {
            value: literal,
          },
        });

        return;
      }
    } catch {
      // NOP
    }

    if (isVarExpression(value) || isNunjucksExpression(value)) {
      this.items.push({
        location: this.getLocationRef(fieldRef),
        data: {
          value: value.__value__,
        },
      });
    } else if (isArray(value)) {
      for (const item of value) {
        this.visitFieldValue(item, fieldRef);
      }
    } else if (isObject(value)) {
      for (const item of Object.values(value)) {
        this.visitFieldValue(item, fieldRef);
      }
    }
  }

  override visitExpression(): void {
    // NOP - handled by visitFieldValue
  }

  async visitStarterBrick(formState: ModComponentFormState) {
    const { starterBrick, modComponent } = formState;

    this.breadcrumbs.push({
      typeLabel: adapter(starterBrick.definition.type).label,
    });

    for (const [prop, value] of Object.entries(
      omit(starterBrick.definition, "reader", "type"),
    )) {
      this.visitFieldValue(value, {
        prop,
        // XXX: in the future, provide field title instead of relying on default display label for prop name.
        // The starter brick prop display names are hard-coded in the React component
        schema: undefined,
      });
    }

    for (const [prop, value] of Object.entries(
      // Starter Brick configuration for the mod component is on the mod component property
      omit(modComponent, "brickPipeline"),
    )) {
      this.visitFieldValue(value, {
        prop,
        // XXX: in the future, provide field title instead of relying on default display label for prop name.
        // The starter brick prop display names are hard-coded in the React component
        schema: undefined,
      });
    }

    this.breadcrumbs.pop();
  }

  override visitBrick(
    position: BrickPosition,
    brickConfig: BrickConfig,
    extra: VisitBlockExtra,
  ): void {
    const { brick } = this.allBricks.get(brickConfig.id) ?? {};

    const context = {
      brickConfig,
      brick,
    };

    this.breadcrumbs.push(context);

    const location: LocationRef = {
      modComponentId: this.modComponentId,
      breadcrumbs: [...this.breadcrumbs],
    };

    super.visitBrick(position, brickConfig, extra);

    if (!isNullOrBlank(brickConfig.label) || brick?.name) {
      this.items.push({
        location,
        data: {
          brick: {
            id: brickConfig.id,
            name: brick?.name,
          },
          label: brickConfig.label,
        },
      });
    }

    if (!isNullOrBlank(brickConfig.comments)) {
      this.items.push({
        location,
        data: {
          brick: {
            id: brickConfig.id,
            name: brick?.name,
          },
          comments: brickConfig.comments,
        },
      });
    }

    if (brickConfig.if) {
      this.visitFieldValue(brickConfig.if, {
        prop: "if",
        schema: {
          title: "Condition",
        },
      });
    }

    if (brickConfig.outputKey) {
      this.visitFieldValue(brickConfig.outputKey, {
        prop: "if",
        schema: {
          title: "Output",
        },
      });
    }

    for (const [prop, value] of Object.entries(brickConfig.config)) {
      // Pipeline expressions are handled by super.visitBrick
      if (!isPipelineExpression(value)) {
        // eslint-disable-next-line security/detect-object-injection -- prop from brick configuration
        const schema = brick?.inputSchema.properties?.[prop];

        this.visitFieldValue(value, {
          prop,
          schema: typeof schema === "object" ? schema : undefined,
        });
      }
    }

    this.breadcrumbs.pop();
  }

  override visitDocumentBuilderElement({
    position,
    blockConfig,
    documentBuilderElement,
    pathInBlock,
  }: VisitDocumentBuilderElementArgs) {
    this.breadcrumbs.push({
      builderElement: documentBuilderElement,
      path: pathInBlock,
    });

    super.visitDocumentBuilderElement({
      position,
      blockConfig,
      documentBuilderElement,
      pathInBlock,
    });

    this.breadcrumbs.pop();
  }

  static async collectItems(
    formStates: ModComponentFormState[],
  ): Promise<IndexedItem[]> {
    const allBricks = await brickRegistry.allTyped();
    return flatten(
      await Promise.all(
        formStates.map(async (formState) => {
          const visitor = new SearchIndexVisitor(formState.uuid, allBricks);
          visitor.visitRootPipeline(formState.modComponent.brickPipeline);
          await visitor.visitStarterBrick(formState);
          return visitor.items;
        }),
      ),
    );
  }
}

export default SearchIndexVisitor;
