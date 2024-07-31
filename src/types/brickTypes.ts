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

import { type BrickConfig } from "@/bricks/types";
import { type Permissions } from "webextension-polyfill";
import { validateRegistryId } from "@/types/helpers";
import { type Schema, type UiSchema } from "@/types/schemaTypes";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type RegistryId, type PackageInstance } from "@/types/registryTypes";
import {
  CONTENT_SCRIPT_CAPABILITIES,
  type PlatformCapability,
} from "@/platform/capabilities";
import { type Nullishable } from "@/utils/nullishUtils";

/**
 * An instance of a re-usable brick.
 * @see BrickDefinition
 */
export interface Brick extends PackageInstance {
  /** A JSON schema of the inputs for the brick */
  inputSchema: Schema;

  /**
   * An optional UiSchema for the inputs for the brick
   *
   * Currently only ui:order is supported.
   *
   * @since 1.7.16
   */
  uiSchema?: UiSchema;

  /**
   * An optional a JSON schema for the output of the brick.
   * @see getOutputSchema
   */
  outputSchema?: Schema;

  /**
   * An optional method to generate a JSON output schema given a brick configuration.
   * @param config the brick configuration
   * @see outputSchema
   * @since 1.7.20
   */
  getOutputSchema?: (config: BrickConfig) => Schema | undefined;

  /**
   * Return a list of platform capabilities that may be required to run this brick.
   * @since 1.8.10
   */
  getRequiredCapabilities: (
    config: BrickConfig,
  ) => Promise<PlatformCapability[]>;

  /**
   * An optional method to generate a JSON schema describing the mod variables set by the brick.
   *
   * Returns `undefined` if `isPageStateAware` is false.
   *
   * @param config the brick configuration
   * @see isPageStateAware
   * @since 1.7.36
   */
  getModVariableSchema?: (config: BrickConfig) => Promise<Schema | undefined>;

  /**
   * Returns a JSON Schema for the shape of a variable introduced by a sub-pipeline.
   * @since 1.8.4
   */
  getPipelineVariableSchema?(
    _config: BrickConfig | undefined,
    pipelineName: string | undefined,
  ): Schema | undefined;

  /**
   * Returns the optional permissions required to run this brick.
   *
   * Only includes this brick's permissions, not the permissions of any bricks passed as inputs to the brick.
   *
   * See https://developer.chrome.com/extensions/permission_warnings
   */
  permissions: Permissions.Permissions;

  /**
   * Returns true iff the brick is guaranteed to be side-effect free, (i.e., it can be safely re-run).
   *
   * Defined as a promise to support bricks that refer to other bricks (and therefore need to look up the status of
   * the other bricks to resolve their purity).
   *
   * Examples of impure actions:
   * - Calling an API
   * - Showing a prompt
   * - Writing to the session state
   */
  isPure: () => Promise<boolean>;

  /**
   * Returns `true` if the brick can use the reader root from the brick options
   *
   * Defined as a promise to support bricks that refer to other bricks (and therefore need to look up the status of
   * the other bricks to resolve their isRootAware status).
   *
   * @see BrickOptions.root
   * @since 1.4.0
   */
  isRootAware: () => Promise<boolean>;

  /**
   * Returns `true` if the brick may read from or write to the page state.
   * @since 1.7.34
   */
  isPageStateAware: () => Promise<boolean>;

  /**
   * (Optional) default root output key to use when this brick is added in the page editor.
   *
   * If not provided, the Page Editor will use a generic name, potentially based on the inferred type of the brick.
   *
   * For example, "foo" will produce: foo, foo2, foo3, foo4, etc.
   *
   * @since 1.3.2
   */
  defaultOutputKey: Nullishable<string>;

  /**
   * (Optional) feature flag required to view/run the brick.
   * @since 2.0.7
   */
  featureFlag?: string;

  /**
   * Run the brick.
   * @param value the rendered input values
   * @param options the runtime options for the brick.
   */
  run: (
    value: BrickArgs | undefined,
    options: BrickOptions,
  ) => Promise<unknown>;
}

/**
 * Abstract base class for Brick implementations.
 */
export abstract class BrickABC implements Brick {
  readonly id: RegistryId;

  readonly name: string;

  readonly description?: string;

  abstract readonly inputSchema: Schema;

  uiSchema?: UiSchema = undefined;

  defaultOutputKey: Nullishable<string> = undefined;

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

  async getRequiredCapabilities(
    _config: BrickConfig,
  ): Promise<PlatformCapability[]> {
    const capabilities: PlatformCapability[] = [];

    if (await this.isRootAware()) {
      capabilities.push(...CONTENT_SCRIPT_CAPABILITIES);
    }

    if (await this.isPageStateAware()) {
      capabilities.push("state");
    }

    return capabilities;
  }

  async isPageStateAware(): Promise<boolean> {
    // Not a safe default, but it's not important currently if we miss any bricks because we're just using this
    // to determine whether to show Page State information in the Page Editor
    // - There's only a few bricks that directly read/write Page State
    // - We only care about the exact brick, not any pipelines that are passed to the brick (e.g., control flow)
    return false;
  }

  getOutputSchema(_config: BrickConfig): Schema | undefined {
    return this.outputSchema;
  }

  async getModVariableSchema(
    _config: BrickConfig,
  ): Promise<Schema | undefined> {
    return undefined;
  }

  /**
   * Returns a JSON Schema for the shape of a variable introduced by a sub-pipeline.
   * @since 1.8.4
   */
  getPipelineVariableSchema(
    _config: BrickConfig,
    _pipelineName: string,
  ): Schema | undefined {
    return undefined;
  }

  protected constructor(id: string, name: string, description?: string) {
    this.id = validateRegistryId(id);
    this.name = name;
    this.description = description;
  }

  abstract run(value: BrickArgs, options: BrickOptions): Promise<unknown>;
}

/**
 * Returns `true` if brick is a user-defined brick (i.e., defined in YAML not JS).
 * @see ExternalBlock
 */
export function isUserDefinedBrick(brick: Brick): boolean {
  // YAML-defined bricks have a .component property added by the UserDefinedBrick class
  // We don't want to introduce circular dependency
  return brick && "component" in brick && Boolean(brick.component);
}
