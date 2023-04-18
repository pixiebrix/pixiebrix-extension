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
import { type ResolvedExtension } from "@/types/extensionTypes";
import { type RunArgs } from "@/types/runtimeTypes";
import { type IBlock } from "@/types/blockTypes";
import { type IReader } from "@/types/blocks/readerTypes";
import { type Metadata } from "@/types/registryTypes";
import { type UnknownObject } from "@/types/objectTypes";

export type IExtensionPoint = Metadata & {
  /**
   * The kind of extension point.
   */
  kind: string;

  /**
   * The input schema for extension point-specific configuration.
   */
  inputSchema: Schema;

  /**
   * Default options to provide to the inputSchema.
   */
  defaultOptions: UnknownObject;

  /**
   * Permissions required to use the extension point.
   */
  permissions: Permissions.Permissions;

  /**
   * Return the IReader used by the extension point. This method should only be called for calculating availability
   * and the schema, as it may include stub readers.
   *
   * @see IExtensionPoint.previewReader
   */
  defaultReader: () => Promise<IReader>;

  /**
   * Return a IReader for generated an `@input` preview. The shape will correspond to defaultReader, but some
   * properties may not be available
   * @see defaultReader
   */
  previewReader: () => Promise<IReader>;

  /**
   * Return true if the extension point is available on the current page. Based on:
   *
   * - URL match patterns
   * - URL pattern rules
   * - Element selector rules
   */
  isAvailable: () => Promise<boolean>;

  /**
   * True iff the extension point must be installed before the page can be considered ready
   */
  syncInstall: boolean;

  /**
   * Install/add the extension point to the page.
   */
  install(): Promise<boolean>;

  /**
   * Remove the extension point and installed extensions from the page.
   */
  uninstall(options?: { global?: boolean }): void;

  /**
   * Remove the extension from the extension point.
   */
  removeExtension(extensionId: UUID): void;

  /**
   * Register an extension with the extension point. Does not actually install/run the extension.
   */
  addExtension(extension: ResolvedExtension): void;

  /**
   * Sync registered extensions, removing any extensions that aren't provided here. Does not actually install/run
   * the extensions.
   */
  syncExtensions(extensions: ResolvedExtension[]): void;

  /**
   * Run the installed extensions for extension point.
   */
  run(args: RunArgs): Promise<void>;

  /**
   * Returns all blocks configured in the IExtension, including sub pipelines.
   *
   * @see PipelineExpression
   */
  getBlocks: (extension: ResolvedExtension) => Promise<IBlock[]>;
};
