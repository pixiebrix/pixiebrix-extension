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

import type { Schema } from "@/types/schemaTypes";
import type { BrickConfig } from "@/bricks/types";
import type { Brick } from "@/types/brickTypes";
import type { Nullishable } from "@/utils/nullishUtils";
import type { SetRequired } from "type-fest";
import type { UUID } from "@/types/stringTypes";
import type { DocumentBuilderElement } from "@/pageEditor/documentBuilder/documentBuilderTypes";

export type StarterBrickBreadcrumb = {
  /**
   * Display name for the starter brick type.
   */
  typeLabel: string;
};

export type BrickContextBreadcrumb = {
  /**
   * The brick configuration.
   */
  brickConfig: BrickConfig;
  /**
   * The brick instance, or undefined if not found in the registry.
   */
  brick: Brick | undefined;
};

export type DocumentBuilderElementBreadcrumb = {
  /**
   * The document builder element.
   */
  builderElement: DocumentBuilderElement;

  /**
   * Path to the element within the document builder body (not the brick configuration).
   */
  bodyPath: string;
};

/**
 * Breadcrumb to show in the find result.
 */
export type ItemBreadcrumb =
  | StarterBrickBreadcrumb
  | BrickContextBreadcrumb
  | DocumentBuilderElementBreadcrumb;

/**
 * Reference to a field within a brick configuration.
 */
export type FieldRef = {
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
   * The breadcrumbs within the mod component.
   */
  breadcrumbs: ItemBreadcrumb[];
  /**
   * The associated field reference (on the brick or document builder element), if any.
   */
  fieldRef?: FieldRef;
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

/**
 * A findable item in the mod.
 */
export type IndexedItem = BrickLabelItem | BrickCommentsItem | FieldValueItem;

export function isStarterBrickBreadcrumb(
  breadcrumb: Nullishable<ItemBreadcrumb>,
): breadcrumb is StarterBrickBreadcrumb {
  return breadcrumb != null && "typeLabel" in breadcrumb;
}

export function isBrickBreadcrumb(
  breadcrumb: Nullishable<ItemBreadcrumb>,
): breadcrumb is BrickContextBreadcrumb {
  return breadcrumb != null && "brickConfig" in breadcrumb;
}

export function isNodeBreadcrumb(
  breadcrumb: Nullishable<ItemBreadcrumb>,
): breadcrumb is StarterBrickBreadcrumb | BrickContextBreadcrumb {
  return isStarterBrickBreadcrumb(breadcrumb) || isBrickBreadcrumb(breadcrumb);
}

export function isDocumentBuilderElementBreadcrumb(
  breadcrumb: Nullishable<ItemBreadcrumb>,
): breadcrumb is DocumentBuilderElementBreadcrumb {
  return (
    breadcrumb != null &&
    (breadcrumb as DocumentBuilderElementBreadcrumb).builderElement !==
      undefined
  );
}

export function isBrickCommentsItem(
  item: Nullishable<IndexedItem>,
): item is BrickCommentsItem {
  return (
    item != null && (item as BrickCommentsItem).data?.comments !== undefined
  );
}

export function isBrickLabelItem(
  item: Nullishable<IndexedItem>,
): item is BrickLabelItem {
  return item != null && (item as BrickLabelItem).data?.brick !== undefined;
}

export function isFieldValueItem(
  item: Nullishable<IndexedItem>,
): item is FieldValueItem {
  return item != null && (item as FieldValueItem).data?.value !== undefined;
}
