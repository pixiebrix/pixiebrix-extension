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

import { type ComponentType } from "react";
import { type UnknownObject } from "@/types/objectTypes";
import { type SafeHTML, type UUID } from "@/types/stringTypes";
import { type SanitizedServiceConfiguration } from "@/types/serviceTypes";
import { type Primitive } from "type-fest";
import { type Logger } from "@/types/loggerTypes";

/**
 * The PixieBrix brick definition API. Controls how the PixieBrix runtime interprets brick definitions.
 *
 * Incremented whenever backward-incompatible changes are made.
 *
 * - v1: original, implicit templating and dataflow
 * - v2: introduces explicitDataFlow
 * - v3: introduces explicit expressions
 */
export type ApiVersion = "v1" | "v2" | "v3";

export type ReaderRoot = HTMLElement | Document;

/**
 * A reference to an element on the page.
 * @see getReferenceForElement
 */
export type ElementReference = UUID & {
  _elementReferenceBrand: never;
};

export type ComponentRef = {
  Component: ComponentType;
  props: Record<string, unknown>;
};

export type RendererOutput = SafeHTML | ComponentRef;

/**
 * A valid identifier for a brick output key or a service key. (Does not include the preceding "@".)
 */
export type OutputKey = string & {
  _outputKeyBrand: never;
};

/**
 * A key with a "@"-prefix that refers to a service
 */
export type ServiceKeyVar = string & {
  _serviceKeyVarBrand: never;
};

/**
 * The tag of an available template engine for rendering an expression given a context.
 * @see mapArgs
 */
export type TemplateEngine =
  // https://mustache.github.io/
  | "mustache"
  // https://mozilla.github.io/nunjucks/
  | "nunjucks"
  // https://handlebarsjs.com/
  | "handlebars"
  // Variable, with support for ? operator
  | "var";

/**
 * The tag of an expression type without the !-prefix that appears in YAML. These appear in YAML files as simple tags,
 * e.g., !pipeline, and are converted into Expressions during deserialization
 * @see Expression
 * @see loadBrickYaml
 * @see TemplateEngine
 * @see BlockPipeline
 */
export type ExpressionType =
  | TemplateEngine
  // BlockPipeline with deferred execution
  | "pipeline"
  // Raw section with deferred rendering (rendered by the brick that executes it)
  | "defer";

/**
 * The JSON/JS representation of an explicit template/variable expression (e.g., mustache, var, etc.)
 * @see BlockConfig
 * @see loadBrickYaml
 * @since 1.5.0
 */
export type Expression<
  // The value. TemplateEngine ExpressionTypes, this will be a string containing the template. For `pipeline`
  // ExpressionType this will be a BlockPipeline. (The loadBrickYaml method will currently accept any array for
  // pipeline at this time, though.
  TTemplateOrPipeline = string,
  // The type tag (without the !-prefix of the YAML simple tag)
  TTypeTag extends ExpressionType = ExpressionType
> = {
  __type__: TTypeTag;
  __value__: TTemplateOrPipeline;
};

/**
 * The extension run reason.
 * @since 1.6.5
 */
export enum RunReason {
  // Skip 0 to avoid truthy/falsy conversion issues

  /**
   * The initial load/navigation of the page.
   */
  INITIAL_LOAD = 1,
  /**
   * The SPA navigated
   */
  NAVIGATE = 2,
  /**
   * A manual run request. One of:
   * - The user toggled the sidebar (sidebar extensions only)
   * - A brick issued a reactivation event
   * - PixieBrix issues a re-activate (e.g., on extension install/uninstall)
   */
  MANUAL = 3,
  /**
   * Experimental: a declared dependency of the extension point changed.
   *
   * See MenuItemExtensionPoint
   */
  DEPENDENCY_CHANGED = 4,
  /**
   * The SPA mutated without navigating
   */
  MUTATION = 5,
  /**
   * Page Editor updated the extension
   * @since 1.7.19
   */
  PAGE_EDITOR = 6,
}

/**
 * Arguments for running an IExtensionPoint
 * @see IExtensionPoint.run
 */
export type RunArgs = {
  /**
   * The reason for running the extension point.
   */
  reason: RunReason;
  /**
   * If provided, only run the specified extensions.
   */
  extensionIds?: UUID[];
};

/**
 * Activation-time mod options.
 */
export type UserOptions = Record<string, Primitive>;

/**
 * Values available to a block to render its arguments.
 * @see BlockArg
 * @see RenderedArgs
 * @see BlockConfig.outputKey
 */
export type BlockArgContext = Record<string, unknown> & {
  _blockArgContextBrand: never;
  "@input": Record<string, unknown>;
  "@options"?: UserOptions;
};

/**
 * The JSON Schema validated arguments to pass into the `run` method of an IBlock.
 *
 * Singular name (as opposed to plural) because it's passed as a single argument to the `run` method.
 *
 * Uses `any` for values so that blocks don't have to assert/cast all their argument types. The input values
 * are validated using JSON Schema in `reducePipeline`.
 *
 * @see IBlock.inputSchema
 * @see IBlock.run
 * @see reducePipeline
 */
export type BlockArg<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- brick is responsible for providing shape
  T extends Record<string, any> = Record<string, any>
> = T & {
  _blockArgBrand: never;
};

/**
 * The non-validated arguments to pass into the `run` method of an IBlock.
 * @see BlockArg
 */
export type RenderedArgs = UnknownObject & {
  _renderedArgBrand: never;
};

/**
 * Service context passed to blocks.
 * @see BlockArgContext
 */
export type ServiceContext = Record<
  ServiceKeyVar,
  {
    __service: SanitizedServiceConfiguration;
    [prop: string]: string | SanitizedServiceConfiguration | null;
  }
>;

// Using "any" for now so that blocks don't have to assert/cast all their argument types. We're checking
// the inputs using yup/jsonschema, so the types should match what's expected.
export type BlockOptions<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
  TCtxt extends Record<string, any> = Record<string, any>
> = {
  /**
   * The variable context, e.g., @input, @options, service definitions, and any output keys from other bricks
   *
   * @see BlockArgContext
   */
  ctxt: TCtxt;

  /**
   * Logger for block messages
   */
  logger: Logger;

  /**
   * Implicit root element (or document) for calls the select/read from the DOM
   */
  root: ReaderRoot;

  /**
   * True if the brick is executing in headless mode.
   */
  headless?: boolean;

  /**
   * Callback to run a sub-pipeline.
   * @since 1.6.4
   */
  runPipeline: (
    // This should be BlockPipeline, but our dependencies are too tangled to use
    // TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/3477
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- brick is responsible for providing shape
    pipeline: any,
    // The branch for tracing. Used to determine order of pipeline runs
    branch: {
      key: string;
      counter: number;
    },
    // Should be UnknownObject, but can't use to introduce a circular dependency
    extraContext?: Record<string, unknown>,
    root?: ReaderRoot
  ) => Promise<unknown>;

  /**
   * Callback to run a renderer pipeline.
   * @since 1.7.13
   */
  runRendererPipeline: (
    // This should be BlockPipeline, but our dependencies are too tangled to use
    // TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/3477
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- brick is responsible for providing shape
    pipeline: any,
    // The branch for tracing. Used to determine order of pipeline runs
    branch: {
      key: string;
      counter: number;
    },
    // Should be UnknownObject, but can't use to introduce a circular dependency
    extraContext?: Record<string, unknown>,
    root?: ReaderRoot
  ) => Promise<unknown>; // Should be PanelPayload

  /**
   * A signal to abort the current block's execution.
   * @since 1.7.19
   */
  abortSignal?: AbortSignal;
};
