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
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { Runtime } from "webextension-polyfill-ts";
import { IExtension, Metadata, Schema, ServiceDependency } from "@/core";
import { FrameworkMeta } from "@/messaging/constants";
import { DynamicDefinition } from "@/nativeEditor";
import { ExtensionPointConfig } from "@/extensionPoints/types";

export type ElementType =
  | "menuItem"
  | "trigger"
  | "panel"
  | "contextMenu"
  | "actionPanel";

export interface ReaderReferenceFormState {
  metadata: Metadata;
}

export interface ReaderFormState {
  _new?: boolean;
  metadata: Metadata;
  outputSchema: Schema;
  definition: {
    /**
     * Reader type corresponding to built-in reader factory, e.g., jquery, react.
     */
    type: string | null;
    selector: string | null;
    selectors: { [field: string]: string };
    optional: boolean;
  };
}

export function isCustomReader(
  reader: ReaderFormState | ReaderReferenceFormState
): reader is ReaderFormState {
  return "definition" in reader;
}

export interface BaseFormState {
  readonly uuid: string;
  readonly type: ElementType;

  installed?: boolean;

  autoReload?: boolean;

  label: string;

  services: ServiceDependency[];

  readers: (ReaderFormState | ReaderReferenceFormState)[];

  extensionPoint: unknown;

  extension: unknown;
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
   * Method for the user to select an element from the host page (e.g., placing a menu button). `undefined` for
   * elements that don't need a reference to the host page to have initial state (e.g., context menus)
   * @param port the devtools port with the backend page
   */
  readonly insert?: (port: Runtime.Port) => Promise<TResult>;

  /**
   * Returns the initial page editor form state for a new element (including new foundation)
   * @param url the URL of the current page
   * @param metadata the initial metadata for the new element
   * @param element the result of the `insert` method
   * @param frameworks the frameworks that PixieBrix has detected on the host page
   *
   * @see fromExtensionPoint
   */
  readonly initialFormStateFactory: (
    url: string,
    metadata: Metadata,
    element: TResult,
    frameworks: FrameworkMeta[]
  ) => TState;

  /**
   * Returns the initial form state from an existing extension point
   * @see initialFormStateFactory
   */
  readonly fromExtensionPoint?: (
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
   */
  readonly selectExtension: (element: TState) => IExtension;
}
