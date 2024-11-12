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

import { type ComponentType } from "react";
import { type SafeHTML, type UUID } from "@/types/stringTypes";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { type Primitive, type Tagged } from "type-fest";
import { type Logger } from "@/types/loggerTypes";
import { type BrickPipeline } from "@/bricks/types";
import { type PanelPayload } from "./sidebarTypes";
import { type PlatformProtocol } from "@/platform/platformProtocol";
import { type Nullishable } from "@/utils/nullishUtils";
import { type ModComponentRef } from "@/types/modComponentTypes";

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

/**
 * Character used to prefix a variable reference.
 */
export const VARIABLE_REFERENCE_PREFIX = "@";

/**
 * The HTMLElement or Document that the brick is targeting, or that a selector is being evaluated against.
 */
export type SelectorRoot = HTMLElement | Document;

export function isDocument(root: SelectorRoot): root is Document {
  return root instanceof Document;
}

/**
 * A reference to an element on the page.
 * @see getReferenceForElement
 */
export type ElementReference = Tagged<UUID, "ElementReference">;

/**
 * A reference to a React component produced by a Renderer brick.
 * @see Renderer
 */
export type ComponentRef = {
  Component: ComponentType;
  props: UnknownObject;
};

/**
 * The output of a Renderer brick.
 */
export type RendererOutput = SafeHTML | ComponentRef;

/**
 * A valid identifier for a brick output key or an integration configuration key. (Does not include the preceding "@".)
 *
 * Conceptually, an output key is a variable name. And the variable is referenced using the "@" prefix with the name.
 *
 * @see VARIABLE_REFERENCE_PREFIX
 * @see isOutputKey
 * @see validateOutputKey
 */
export type OutputKey = Tagged<string, "OutputKey">;

/**
 * A variable with a "@"-prefix that refers to an integration
 */
export type IntegrationDependencyVarRef = Tagged<
  string,
  "IntegrationDependencyVarRef"
>;

/**
 * A text template engine.
 */
export type TextTemplateEngine =
  // https://mustache.github.io/
  | "mustache"
  // https://mozilla.github.io/nunjucks/
  | "nunjucks"
  // https://handlebarsjs.com/
  | "handlebars"
  // Run expression in JS sandbox
  | "javascript";

/**
 * The tag of an available template engine for rendering an expression given a context.
 * @see mapArgs
 */
export type TemplateEngine =
  | TextTemplateEngine
  // Variable, with support for ? operator
  | "var";

/**
 * The tag of an expression type without the !-prefix that appears in YAML. These appear in YAML files as simple tags,
 * e.g., !pipeline, and are converted into Expressions during deserialization
 * @see Expression
 * @see loadBrickYaml
 * @see TemplateEngine
 * @see BrickPipeline
 */
export type ExpressionType =
  | TemplateEngine
  // BrickPipeline with deferred execution
  | "pipeline"
  // Raw section with deferred rendering (rendered by the brick that executes it)
  | "defer";

/**
 * The JSON/JS representation of an explicit template/variable expression (e.g., mustache, var, etc.)
 * @see BrickConfig
 * @see loadBrickYaml
 * @since 1.5.0
 */
export type Expression<
  // The value. TemplateEngine ExpressionTypes, this will be a string containing the template. For `pipeline`
  // ExpressionType this will be a BrickPipeline. (The loadBrickYaml method will currently accept any array for
  // pipeline at this time, though.)
  TTemplateOrPipeline = string,
  // The type tag (without the !-prefix of the YAML simple tag)
  TTypeTag extends ExpressionType = ExpressionType,
> = {
  __type__: TTypeTag;
  __value__: TTemplateOrPipeline;
};

export type PipelineExpression = Expression<BrickPipeline, "pipeline">;

export type DeferExpression<TValue = UnknownObject> = Expression<
  TValue,
  "defer"
>;

/**
 * A branch in an execution trace.
 */
type TraceBranch = {
  /**
   * A locally unique key for the branch.
   *
   * Generally corresponds to the pipeline argument name for a control-flow brick.
   *
   * @example "if", "else", "try", "except", "body"
   */
  key: string;
  /**
   * The branch counter, e.g., the iteration of a loop.
   *
   * Generally should be 0 for non-looping control-flow.
   */
  counter: number;
};

/**
 * The ModComponent run reason.
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
   * - The user toggled the sidebar (sidebar ModComponents only)
   * - A brick issued a reactivation event
   * - PixieBrix issues a re-activate (e.g., on extension install/uninstall)
   */
  MANUAL = 3,
  /**
   * The SPA mutated without navigating
   */
  MUTATION = 4,
  /**
   * Page Editor ran the ModComponent either because:
   * - The user clicked the "Run" button, or
   * - The user turned on auto-reload for the ModComponent and made a change
   * @since 1.7.19
   * @see ReloadToolbar
   */
  PAGE_EDITOR_RUN = 5,
  /**
   * Page Editor registered/re-register the ModComponent instance. Intended to re-attach buttons/triggers without
   * re-running attached bricks immediately.
   * @since 2.1.6
   * @see useRegisterDraftModInstanceOnAllFrames
   */
  PAGE_EDITOR_REGISTER = 6,
}

/**
 * Arguments for running an StarterBrick
 * @see StarterBrick.runModComponents
 */
export type RunArgs = {
  /**
   * The reason for running the StarterBrick.
   */
  reason: RunReason;
  /**
   * If provided, only run the specified ModComponents.
   */
  modComponentIds?: UUID[] | null;
};

/**
 * Activation-time mod options arguments provided by the end-user or deployment admin.
 */
export type OptionsArgs = Record<string, Primitive>;

/**
 * Values available to a brick to render its arguments.
 * @see BrickArgs
 * @see RenderedArgs
 * @see BrickConfig.outputKey
 */
export type BrickArgsContext = Tagged<
  UnknownObject & {
    "@input": UnknownObject;
    "@options"?: OptionsArgs;
  },
  "BrickArgsContext"
>;

/**
 * Returns an object as a BrickArgsContext, or throw a TypeError if it's not a valid context.
 */
export function validateBrickArgsContext(obj: UnknownObject): BrickArgsContext {
  if (!("@input" in obj)) {
    throw new TypeError("BrickArgsContext must have @input property");
  }

  return obj as BrickArgsContext;
}

/**
 * The JSON Schema validated arguments to pass into the `run` method of a Brick.
 *
 * Uses `any` for values so that bricks don't have to assert/cast all their argument types. The input values
 * are validated using JSON Schema in `reducePipeline`.
 *
 * @see Brick.inputSchema
 * @see Brick.run
 * @see reducePipeline
 */
export type BrickArgs<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- brick is responsible for providing shape
  T extends Record<string, any> = Record<string, any>,
> = Tagged<T, "BrickArgs">;

/**
 * The non-validated arguments to pass into the `run` method of a Brick.
 * @see BrickArgs
 */
export type RenderedArgs = Tagged<UnknownObject, "RenderedArgs">;

export type IntegrationContextValue = {
  // NOTE: this is not a nominal type brand. The `__service` key is actually used in the runtime.
  __service: SanitizedIntegrationConfig;
  [prop: string]: string | SanitizedIntegrationConfig | null;
};

/**
 * Integration configuration context passed to each brick.
 * @see BrickArgsContext
 */
export type IntegrationContext = Record<
  IntegrationDependencyVarRef,
  IntegrationContextValue | null
>;

/**
 * An execution branch (defer, pipeline, etc.).
 * @since 1.7.0
 */
export type Branch = {
  /**
   * A static identifier for the branch.
   *
   * In practice, will typically be the name of the pipeline in the brick, e.g., "if", "else", "try", "body", etc.
   *
   * @since 1.7.0
   */
  key: string;
  /**
   * A monotonically increasing counter for executions of branch with key
   * @since 1.7.0
   */
  counter: number;
};

/**
 * Metadata about the current run.
 */
export interface RunMetadata {
  /**
   * The mod component that's running the brick. Used to:
   *
   * - Associate UI elements with the mod component (e.g., forms, quickbar actions, etc.)
   * - Used to correlate trace records across all runs/branches.
   *
   * @since 2.0.6 is the full ModComponentRef instead of just the modComponentId
   */
  modComponentRef: ModComponentRef;
  /**
   * A unique run id to correlate trace records across branches for a run, or nullish to disable tracing.
   */
  runId: Nullishable<UUID>;
  /**
   * The control flow branch to correlate trace records for a brick.
   * @since 1.7.0
   */
  branches: Branch[];
}

// Using "any" so bricks don't have to assert/cast all their argument types. We're checking
// the inputs using yup/jsonschema, so the types should match what's expected.
export type BrickOptions<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
  TCtxt extends Record<string, any> = Record<string, any>,
> = {
  /**
   * The platform/environment running the brick.
   * @since 1.8.10
   */
  platform: PlatformProtocol;

  /**
   * The variable context, e.g., @input, @options, integration configurations, and any output keys from other bricks
   *
   * @see BrickArgsContext
   */
  ctxt: TCtxt;

  /**
   * Logger for brick messages
   */
  logger: Logger;

  /**
   * Implicit root element (or document) for calls the select/read from the DOM
   */
  root?: SelectorRoot;

  /**
   * True if the brick is executing in headless mode.
   *
   * @see HeadlessModeError
   */
  headless?: boolean;

  /**
   * Callback to run a sub-pipeline.
   * @param pipeline the pipeline to run
   * @param branch the branch for tracing. Used to determine order of pipeline runs
   * @param extraContext additional context to pass to the pipeline, e.g., `@error`
   * @param root the root element to use for selectors
   * @since 1.6.4
   */
  runPipeline: (
    pipeline: PipelineExpression,
    branch: TraceBranch,
    extraContext?: UnknownObject,
    root?: SelectorRoot | null,
  ) => Promise<unknown>;

  /**
   * Callback to run a renderer pipeline.
   * @param pipeline the pipeline to run
   * @param branch the branch for tracing. Used to determine order of pipeline runs
   * @param extraContext additional context to pass to the pipeline, e.g., `@error`
   * @param root the root element to use for selectors
   * @since 1.7.13
   */
  runRendererPipeline: (
    pipeline: PipelineExpression,
    branch: TraceBranch,
    extraContext?: UnknownObject,
    root?: SelectorRoot,
  ) => Promise<PanelPayload>;

  /**
   * A signal to abort the current brick's execution.
   * @since 1.7.19
   */
  abortSignal?: AbortSignal;

  /**
   * Trace metadata.
   *
   * Added to enable the UserDefinedBrick to pass the runId to the runtime because it can't make direct calls
   * to BrickOptions.runPipeline or BrickOptions.runRendererPipeline.
   *
   * In general, you should not need to use this information.
   *
   * @since 1.8.4
   */
  meta: RunMetadata;
};
