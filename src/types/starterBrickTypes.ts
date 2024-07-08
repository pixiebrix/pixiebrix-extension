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

import { type Permissions } from "webextension-polyfill";
import { type Schema } from "@/types/schemaTypes";
import { type UUID } from "@/types/stringTypes";
import { type HydratedModComponent } from "@/types/modComponentTypes";
import { type RunArgs } from "@/types/runtimeTypes";
import { type Brick } from "@/types/brickTypes";
import { type Reader } from "@/types/bricks/readerTypes";
import { type PackageInstance } from "@/types/registryTypes";
import { type PlatformCapability } from "@/platform/capabilities";
import { type ValueOf } from "type-fest";

/**
 * Constants for starter brick types/kinds. Used to update names in code to match UI display names without migrating
 * persisted values.
 */
export const StarterBrickTypes = {
  // Match terminology in the Page Editor UI
  SIDEBAR_PANEL: "actionPanel",
  BUTTON: "menuItem",
  TRIGGER: "trigger",
  CONTEXT_MENU: "contextMenu",
  QUICK_BAR_ACTION: "quickBar",
  DYNAMIC_QUICK_BAR: "quickBarProvider",
} as const;

/**
 * @see StarterBrick.kind
 */
export type StarterBrickType = ValueOf<typeof StarterBrickTypes>;

/**
 * A location where content (e.g., form, temporary panel) can be added to the page.
 */
export type Location =
  // Sidebar panel. ephemeralForm uses `sidebar` as the location for the sidebar
  "panel" | "modal" | "popover";

/**
 * A StarterBrick entity on a page that can ModComponents can be added to.
 */
export interface StarterBrick extends PackageInstance {
  /**
   * The kind of StarterBrick.
   */
  kind: StarterBrickType;

  /**
   * The input schema for StarterBrick-specific configuration.
   */
  inputSchema: Schema;

  /**
   * Default configuration options.
   */
  defaultOptions: UnknownObject;

  /**
   * Permissions required to use the StarterBrick.
   */
  permissions: Permissions.Permissions;

  /**
   * Platform capabilities required to use the StarterBrick.
   * @since 1.8.10
   */
  capabilities: PlatformCapability[];

  /**
   * Return the Reader used by the StarterBrick. This method should only be called for calculating availability
   * and the schema, as it may include stub readers.
   *
   * @see StarterBrick.previewReader
   */
  defaultReader: () => Promise<Reader>;

  /**
   * Return a Reader for generated an `@input` preview. The shape will correspond to defaultReader, but some
   * properties may not be available
   * @see defaultReader
   */
  previewReader: () => Promise<Reader>;

  /**
   * Return true if the StarterBrick should be available on the current page, based on:
   * - URL match patterns
   * - URL pattern rules
   * - Element selector rules. Does not attempt to wait for the element to be in the DOM.
   */
  isAvailable: () => Promise<boolean>;

  /**
   * True if the StarterBrick must be installed and components run before a lifecycle run is considered complete.
   *
   * Always false for starter bricks that wait for certain elements to appear on the page.
   *
   * @see handleNavigate
   */
  isSyncInstall: boolean;

  /**
   * Install the StarterBrick on the page when its target becomes available. Does not run/add ModComponents to the page.
   *
   * Safe to call multiple times.
   *
   * @see runModComponents
   * @see isAvailable
   */
  install(): Promise<boolean>;

  /**
   * Register a ModComponent with the StarterBrick. Does not add/run the ModComponent to the page.
   *
   * @see runModComponents
   * @see synchronizeModComponents
   */
  registerModComponent(component: HydratedModComponent): void;

  /**
   * Run all registered ModComponents for this StarterBrick and/or add their UI to the page.
   *
   * Call registerModComponent or synchronizeModComponents before calling this method.
   *
   * @see install
   * @see registerModComponent
   * @see synchronizeModComponents
   */
  runModComponents(args: RunArgs): Promise<void>;

  /**
   * Remove the ModComponent from the StarterBrick and clear its UI and events from the page.
   *
   * @see synchronizeModComponents
   */
  removeModComponent(modComponentId: UUID): void;

  /**
   * Remove the StarterBrick and all ModComponents from the page.
   *
   * Uninstall can only be called once per StarterBrick instance. Some starter bricks, e.g., menuItem, may throw an
   * error if they've already been uninstalled.
   *
   * @param options.global true to indicate the starter brick is being uninstalled from all tabs. This enables the
   * starter brick to perform global UI/event cleanup, e.g., unregistering a context menu with the Browser.
   * @see removeModComponent
   */
  uninstall(options?: { global?: boolean }): void;

  /**
   * Synchronize registered ModComponents, removing any ModComponents that aren't provided. DOES NOT run the components.
   *
   * Equivalent to calling `removeComponent` and `registerComponent`.
   *
   * @see removeModComponent
   * @see registerModComponent
   */
  synchronizeModComponents(modComponents: HydratedModComponent[]): void;

  /**
   * Returns all bricks configured in provided ModComponentBase, including sub-pipelines.
   *
   * @param modComponent the ModComponent to get bricks for
   * @see PipelineExpression
   */
  getBricks: (modComponent: HydratedModComponent) => Promise<Brick[]>;

  /**
   * The mod components currently registered with the StarterBrick.
   * @since 1.7.34
   */
  registeredModComponents: readonly HydratedModComponent[];
}
