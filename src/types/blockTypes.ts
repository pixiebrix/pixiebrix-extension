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

import { type BlockConfig } from "@/blocks/types";
import { type Permissions } from "webextension-polyfill";
import { validateRegistryId } from "@/types/helpers";
import { type Schema, type UiSchema } from "@/types/schemaTypes";
import { type BlockArgs, type BlockOptions } from "@/types/runtimeTypes";
import { type RegistryId, type Metadata } from "@/types/registryTypes";
import { type BlockIcon } from "@/types/iconTypes";

/**
 * An instance of a re-usable block.
 * @see BlockDefinition
 */
export interface IBlock extends Metadata {
  /** A JSON schema of the inputs for the block */
  inputSchema: Schema;

  /**
   * An optional UiSchema for the inputs for the block
   *
   * Currently only ui:order is supported.
   *
   * @since 1.7.16
   */
  uiSchema?: UiSchema;

  /**
   * An optional a JSON schema for the output of the block.
   * @see getOutputSchema
   */
  outputSchema?: Schema;

  /**
   * An optional method to generate a JSON output schema given a block configuration.
   * @param config the block configuration
   * @see outputSchema
   * @since 1.7.20
   */
  getOutputSchema?: (config: BlockConfig) => Schema | undefined;

  /**
   * Returns the optional permissions required to run this block.
   *
   * Only includes this block's permissions, not the permissions of any blocks passed as inputs to the block.
   *
   * See https://developer.chrome.com/extensions/permission_warnings
   */
  permissions: Permissions.Permissions;

  /**
   * Returns true iff the block is guaranteed to be side-effect free, (i.e., it can be safely re-run).
   *
   * Defined as a promise to support blocks that refer to other blocks (and therefore need to look up the status of
   * the other blocks to resolve their purity).
   *
   * FIXME: isPure is marked as optional because we're using IBlock to represent packages/bricks in some places, e.g.,
   *  the BrickModal. We need to make this require and fix the types in the places that break. For example, some places
   *  take advantages the IExtensionPoint is compatible with the the IBlock interface even though they represent two
   *  different concepts
   *
   * Examples of impure actions:
   * - Calling an API
   * - Showing a prompt
   * - Writing to the session state
   */
  isPure?: () => Promise<boolean>;

  /**
   * Returns `true` if the block can use the reader root from the block options
   *
   * Defined as a promise to support blocks that refer to other blocks (and therefore need to look up the status of
   * the other blocks to resolve their isRootAware status).
   *
   * @see BlockOptions.root
   * @since 1.4.0
   */
  isRootAware?: () => Promise<boolean>;

  /**
   * (Optional) default root output key to use when this block is added in the page editor.
   *
   * If not provided, the Page Editor will use a generic name, potentially based on the inferred type of the brick.
   *
   * For example, "foo" will produce: foo, foo2, foo3, foo4, etc.
   *
   * @since 1.3.2
   */
  defaultOutputKey?: string;

  /**
   * Run the block.
   * @param value the rendered input values
   * @param options the runtime options for the block.
   */
  run: (value: BlockArgs, options: BlockOptions) => Promise<unknown>;
}

/**
 * Abstract base class for IBlock implementations.
 */
export abstract class Block implements IBlock {
  readonly id: RegistryId;

  readonly name: string;

  readonly description: string;

  readonly icon: BlockIcon;

  abstract readonly inputSchema: Schema;

  outputSchema?: Schema = undefined;

  readonly permissions = {};

  async isPure(): Promise<boolean> {
    // Safe default
    return false;
  }

  async isRootAware(): Promise<boolean> {
    // Safe default
    return true;
  }

  getOutputSchema(_config: BlockConfig): Schema | undefined {
    return this.outputSchema;
  }

  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon?: BlockIcon
  ) {
    this.id = validateRegistryId(id);
    this.name = name;
    this.description = description;
    this.icon = icon;
  }

  abstract run(value: BlockArgs, options: BlockOptions): Promise<unknown>;
}

/**
 * Returns `true` if block is a user-defined block (i.e., defined in YAML not JS).
 * @param block the block
 * @see ExternalBlock
 */
export function isUserDefinedBlock(block: IBlock): boolean {
  // YAML-defined blocks have a .component property added by the ExternalBlock class
  // We don't want to introduce circular dependency
  return block && "component" in block && Boolean(block.component);
}
