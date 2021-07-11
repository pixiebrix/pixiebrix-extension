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
import { ElementType, FormState } from "@/devTools/editor/editorSlice";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { Runtime } from "webextension-polyfill-ts";
import { IExtension, Metadata } from "@/core";
import { FrameworkMeta } from "@/messaging/constants";
import { DynamicDefinition } from "@/nativeEditor";
import { ExtensionPointConfig } from "@/extensionPoints/types";

/**
 * ExtensionPoint configuration for use with the Page Editor.
 */
export interface ElementConfig<
  TResult = unknown,
  TState extends FormState = FormState
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
   * all users should be able to use the element.
   */
  readonly flag?: string;

  /**
   * Method for the user to select an element from the host page (e.g., placing a menu button). `undefined` for
   * elements that don't need a reference to the host page to have initial state (e.g., context menus)
   * @param port the devtools port with the backend page
   */
  readonly insert?: (port: Runtime.Port) => Promise<TResult>;

  /**
   * Make the initial page editor form state for a new element
   * @param url the URL of the current page
   * @param metadata the initial metadata for the new element
   * @param element the result of the `insert` method
   * @param frameworks the frameworks that PixieBrix has detected on the host page
   */
  readonly makeState: (
    url: string,
    metadata: Metadata,
    element: TResult,
    frameworks: FrameworkMeta[]
  ) => TState;

  readonly asDynamicElement: (state: TState) => DynamicDefinition;

  readonly makeFromExtensionPoint?: (
    url: string,
    config: ExtensionPointConfig
  ) => Promise<TState>;

  readonly extensionPoint: (element: TState) => ExtensionPointConfig;

  readonly extension: (element: TState) => IExtension;

  readonly formState: (extension: IExtension) => Promise<TState>;
}
