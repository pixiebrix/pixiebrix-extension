/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import React from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import {
  ApiVersion,
  IExtension,
  Metadata,
  RecipeMetadata,
  RegistryId,
  ServiceDependency,
  UserOptions,
  UUID,
} from "@/core";
import { FrameworkMeta } from "@/messaging/constants";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { DynamicDefinition } from "@/nativeEditor/dynamic";
import { BlockPipeline, NormalizedAvailability } from "@/blocks/types";
import { Target } from "@/types";

export type ElementType =
  | "menuItem"
  | "trigger"
  | "panel"
  | "contextMenu"
  | "actionPanel"
  | "quickBar";

/**
 * A simplified type for ReaderConfig to prevent TypeScript reporting problems with infinite type instantiation
 * @see ReaderConfig
 */
export type SingleLayerReaderConfig =
  | RegistryId
  | RegistryId[]
  | Record<string, RegistryId>;

export interface BaseExtensionPointState {
  metadata: Metadata;
  definition: {
    // We're currently not allowing users to modify readers in the page editor
    reader: SingleLayerReaderConfig;
    isAvailable: NormalizedAvailability;
  };
}

export interface BaseExtensionState {
  blockPipeline: BlockPipeline;
}

export interface BaseFormState<
  TExtension extends BaseExtensionState = BaseExtensionState
> {
  /**
   * The apiVersion of the brick definition, controlling how PixieBrix interprets brick definitions
   * @see ApiVersion
   */
  readonly apiVersion: ApiVersion;

  /**
   * Are we currently showing the info message to users about upgrading from v2 to v3 of
   * the runtime api for this extension?
   */
  readonly showV3UpgradeMessage: boolean;

  /**
   * The extension uuid
   */
  readonly uuid: UUID;

  /**
   * The type of the extensionPoint
   */
  readonly type: ElementType;

  /**
   * True if the extensionPoint exists in in the registry
   */
  installed?: boolean;

  /**
   * True if the extension should be allowed to auto-reload. In general, only extensions that require user
   * interaction to trigger should be allowed to auto-reload. Otherwise, PixieBrix might end up spamming a API
   */
  autoReload?: boolean;

  /**
   * User-provided name to identify the extension
   */
  label: string;

  /**
   * The options the user provided when installing the extension as a blueprint from the marketplace.
   *
   * Not currently exposed in the page editor.
   *
   * @since 1.4.3
   */
  optionsArgs: UserOptions;

  services: ServiceDependency[];

  extensionPoint: BaseExtensionPointState;

  extension: TExtension;

  /**
   * Information about the recipe (i.e., blueprint) used to install the extension, or `undefined` if the extension
   * is not part of a recipe.
   * @see IExtension._recipe
   */
  recipe: RecipeMetadata | undefined;
}

/**
 * ExtensionPoint configuration for use with the Page Editor.
 */
export interface ElementConfig<
  TResult = unknown,
  TState extends BaseFormState = BaseFormState
> {
  /**
   * The internal element type, e.g., menuItem, contextMenu, etc.
   */
  readonly elementType: ElementType;

  /**
   * The ExtensionPointConfig class corresponding to the extension point
   * @see ExtensionPointConfig
   */
  // eslint-disable-next-line @typescript-eslint/ban-types -- we want to Ctor here for the extension point
  readonly baseClass: Function;

  readonly EditorNode?: React.ComponentType<{ isLocked: boolean }>;

  /**
   * Order to display this element in the new element dropdown in the sidebar
   */
  readonly displayOrder: number;

  /**
   * The human-friendly name to refer to the element type (e.g., Context Menu)
   */
  readonly label: string;

  /**
   * FontAwesome icon representing the element type
   */
  readonly icon: IconProp;

  /**
   * True if the element type should be considered "beta" functionality in the page editor. E.g., for showing a
   * "beta" badge/indicator and/or warning the user that using this element is currently in beta
   */
  readonly beta?: boolean;

  /**
   * Feature flag that indicates whether or not the element type is enabled for the user. `undefined` to indicate
   * all users should be able to create/edit the elements of this type.
   */
  readonly flag?: string;

  /**
   * Method for the user to select an element from the host page (e.g., placing a menu button).
   * `undefined` for elements that aren't placed natively in the host page (e.g., context menus)
   * @param target the tab on which to run the function
   */
  readonly selectNativeElement?: (target: Target) => Promise<TResult>;

  /**
   * Returns the initial page editor form state for a new element (including new foundation)
   * @param url the URL of the current page
   * @param metadata the initial metadata for the new element
   * @param element the result of the `insert` method
   * @param frameworks the frameworks that PixieBrix has detected on the host page
   *
   * @see fromExtensionPoint
   */
  readonly fromNativeElement: (
    url: string,
    metadata: Metadata,
    element: TResult,
    frameworks?: FrameworkMeta[]
  ) => TState;

  /**
   * Returns the initial form state from an existing extension point
   * @see fromNativeElement
   */
  readonly fromExtensionPoint: (
    url: string,
    config: ExtensionPointConfig
  ) => Promise<TState>;

  /**
   * Returns a dynamic element definition that the content script can render on the page
   */
  readonly asDynamicElement: (state: TState) => DynamicDefinition;

  /**
   * Returns the FormState corresponding to extension
   */
  readonly fromExtension: (extension: IExtension) => Promise<TState>;

  /**
   * Returns the extension point configuration corresponding to the FormState.
   */
  readonly selectExtensionPoint: (element: TState) => ExtensionPointConfig;

  /**
   * Returns the extension configuration corresponding to the FormState.
   *
   * NOTE: If the extension uses an innerDefinition for the extension point, the extensionPointId will point to the
   * temporary `@inner/` RegistryId generated by the Page Editor.
   *
   * @see isInnerExtensionPoint
   * @see extensionWithInnerDefinitions
   */
  readonly selectExtension: (element: TState) => IExtension;

  /**
   * Help text to show in the generic insertion-mode pane
   */
  readonly insertModeHelp?: React.ReactNode;
}
