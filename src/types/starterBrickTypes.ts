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

import { type Permissions } from "webextension-polyfill";
import { type Schema } from "@/types/schemaTypes";
import { type UUID } from "@/types/stringTypes";
import { type ResolvedModComponent } from "@/types/modComponentTypes";
import { type RunArgs } from "@/types/runtimeTypes";
import { type Brick } from "@/types/brickTypes";
import { type Reader } from "@/types/bricks/readerTypes";
import { type Metadata } from "@/types/registryTypes";
import { type UnknownObject } from "@/types/objectTypes";

/**
 * A location where content (e.g., form, temporary panel) can be added to the page.
 */
export type Location =
  // Sidebar panel. ephemeralForm uses `sidebar` as the location for the sidebar
  "panel" | "modal" | "popover";

/**
 * A StarterBrick entity on a page that can ModComponents can be added to.
 */
export interface StarterBrick extends Metadata {
  /**
   * The kind of StarterBrick.
   */
  kind: string;

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
   * True if the StarterBrick must be installed before the mods on the page should be considered ready.
   */
  isSyncInstall: boolean;

  /**
   * Install the StarterBrick on the page if/when its target becomes available.
   * Does not run/add ModComponents to the page.
   * @see runComponents
   */
  install(): Promise<boolean>;

  /**
   * Register a ModComponent with the StarterBrick. Does not add/run the ModComponent to the page.
   * @see runComponents
   */
  registerComponent(component: ResolvedModComponent): void;

  /**
   * Run all registered ModComponents for this StarterBrick and/or add their UI to the page.
   * @see install
   */
  runComponents(args: RunArgs): Promise<void>;

  /**
   * Remove the ModComponent from the StarterBrick and clear its UI and events from the page.
   */
  removeComponent(modComponentId: UUID): void;

  /**
   * Remove the StarterBrick and all ModComponents from the page.
   *
   * @param options.global true to indicate the starter brick is being uninstalled from all tabs. This enabled the
   * starter brick to perform global UI cleanup, e.g., unregistering a context menu with the Browser.
   * @see removeComponent
   */
  uninstall(options?: { global?: boolean }): void;

  /**
   * Synchronize registered ModComponents, removing any ModComponents that aren't provided. DOES NOT run the components.
   *
   * Equivalent to calling `removeComponent` and `registerComponent`.
   *
   * @see removeComponent
   * @see registerComponent
   */
  synchronizeComponents(modComponents: ResolvedModComponent[]): void;

  /**
   * Returns all bricks configured in provided ModComponentBase, including sub-pipelines.
   *
   * @param modComponent the ModComponent to get bricks for
   * @see PipelineExpression
   */
  getBricks: (modComponent: ResolvedModComponent) => Promise<Brick[]>;

  /**
   * The mod components currently registered with the StarterBrick.
   * @since 1.7.34
   */
  registeredComponents: readonly ResolvedModComponent[];
}
