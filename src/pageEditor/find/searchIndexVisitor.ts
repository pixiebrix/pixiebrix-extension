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
import { type UUID } from "@/types/stringTypes";
import brickRegistry, { type TypedBrickMap } from "@/bricks/registry";
import {
  castTextLiteralOrThrow,
  isNunjucksExpression,
  isPipelineExpression,
  isVarExpression,
} from "@/utils/expressionUtils";
import type { Brick } from "@/types/brickTypes";
import { isNullOrBlank } from "@/utils/stringUtils";
import type { Schema } from "@/types/schemaTypes";
import { flatten, isArray, omit } from "lodash";
import { isObject } from "@/utils/objectUtils";
import type { SetRequired } from "type-fest";
import { isPrimitive } from "@/utils/typeUtils";
import { type BaseStarterBrickState } from "@/pageEditor/store/editor/baseFormStateTypes";
import { adapter } from "@/pageEditor/starterBricks/adapter";
import { type Nullishable } from "@/utils/nullishUtils";

export type StarterBrickContext = {
  typeLabel: string;
};

export type BrickContext = {
  /**
   * The brick configuration.
   */
  brickConfig: BrickConfig;
  /**
   * The brick instance, or undefined if not found in the registry.
   */
  brick: Brick | undefined;
};

/**
 * Reference to a field within a brick configuration.
 */
type FieldRef = {
  /**
   * The name of the prop
   */
  prop: string;
  /**
   * The schema for the field, if available.
   */
  schema: Schema | undefined;
};

/**
 * A reference to a location within the mod. Used to navigate to the item in the Page Editor.
 */
export type LocationRef = {
  /**
   * The containing mod component.
   */
  modComponentId: UUID;
  /**
   * The nested brick stack.
   */
  brickStack: Array<BrickContext | StarterBrickContext>;
  /**
   * The associated brick field reference, if any.
   */
  fieldRef?: FieldRef;
  /**
   * The associated document or form builder element path, if any.
   */
  builderElementPath?: string;
};

/**
 * An item in the search index corresponding to a brick custom label/name.
 */
export type BrickLabelItem = {
  location: LocationRef;
  data: {
    brick: {
      id: string;
      name?: string;
    };
    label?: string;
  };
};

/**
 * An item in the search index corresponding to brick's comments.
 */
export type BrickCommentsItem = {
  location: LocationRef;
  data: {
    comments: string;
  };
};

/**
 * An item corresponding to a configured field value.
 */
export type FieldValueItem = {
  location: SetRequired<LocationRef, "fieldRef">;
  data: {
    value: string;
  };
};

export type IndexedItem = BrickLabelItem | BrickCommentsItem | FieldValueItem;

export function isStarterBrickContext(
  context: Nullishable<BrickContext | StarterBrickContext>,
): context is StarterBrickContext {
  return context != null && "typeLabel" in context;
}

export function isBrickContext(
  context: Nullishable<BrickContext | StarterBrickContext>,
): context is BrickContext {
  return context != null && "brickConfig" in context;
}

export function isBrickCommentsItem(
  item: IndexedItem,
): item is BrickCommentsItem {
  return (item as BrickCommentsItem).data?.comments !== undefined;
}

export function isFieldValueItem(item: IndexedItem): item is FieldValueItem {
  return (item as FieldValueItem).data?.value !== undefined;
}

/**
 * Visitor to collect mod fragments for search within a mod.
 * @since 1.7.34
 */
class SearchIndexVisitor extends PipelineVisitor {
  readonly items: IndexedItem[] = [];

  readonly brickStack: Array<BrickContext | StarterBrickContext> = [];

  constructor(
    readonly modComponentId: UUID,
    readonly allBricks: TypedBrickMap,
  ) {
    super();
  }

  getLocationRef(fieldRef: FieldRef) {
    return {
      modComponentId: this.modComponentId,
      brickStack: [...this.brickStack],
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

    this.brickStack.push(context);

    const location: LocationRef = {
      modComponentId: this.modComponentId,
      brickStack: [...this.brickStack],
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
          title: "Output Variable",
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

    this.brickStack.pop();
  }

  async visitStarterBrick(starterBrick: BaseStarterBrickState) {
    this.brickStack.push({
      typeLabel: adapter(starterBrick.definition.type).label,
    });

    for (const [prop, value] of Object.entries(
      omit(starterBrick.definition, "reader", "type"),
    )) {
      this.visitFieldValue(value, {
        prop,
        // TODO: provide field title. They're currently hard-coded in the React components
        schema: undefined,
      });
    }

    this.brickStack.pop();
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
          await visitor.visitStarterBrick(formState.starterBrick);
          return visitor.items;
        }),
      ),
    );
  }
}

export default SearchIndexVisitor;
