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

import { type RegistryId } from "@/types/registryTypes";
import {
  type ElementReference,
  type Expression,
  type OutputKey,
  type TemplateEngine,
} from "@/types/runtimeTypes";
import { type UUID } from "@/types/stringTypes";

export type ReaderConfig =
  | RegistryId
  | { [key: string]: ReaderConfig }
  | ReaderConfig[];

/**
 * Where to execute the brick
 * - self: the current tab/frame
 * - opener: the tab that opened the current tab
 * - target: the last tab that the current tab opened
 * - top: the top-most frame in the window
 * - all_frames: all frames in the window
 * - broadcast: all tabs that PixieBrix has access to (the result is returned as an array)
 * @see {@link BrickConfig.window}
 * @since 1.7.36 - added all_frames
 */
export type BrickWindow =
  | "self"
  | "opener"
  | "target"
  | "top"
  | "broadcast"
  | "all_frames";

/**
 * Returns true if the BrickWindow targets multiple tabs and/or frames.
 *
 * The runtime will return an array of results (one for each successful target)
 */
export function hasMultipleTargets(
  window: BrickWindow | undefined,
): window is "broadcast" | "all_frames" {
  return window === "broadcast" || window === "all_frames";
}

/**
 * Condition expression written in templateEngine for deciding if the step should be run.
 * @see {@link BrickConfig.if}
 */
export type BlockIf = string | boolean | number | Expression;

/**
 * A brick configuration to be executed by the PixieBrix runtime.
 * @see runStage
 * @see reducePipeline
 */
export type BrickConfig = {
  /**
   * The registry id of the configured brick
   */
  id: RegistryId;

  /**
   * The configuration of the brick
   */
  // XXX: in the future, should use JsonObject here, but will require extra type assertions in the codebase.
  config: UnknownObject;

  /**
   * (Optional) human-readable label for the step.
   *
   * Shown in the page editor, logs, and the progress indicator
   * @see notifyProgress
   */
  label?: string;

  /**
   * (Optional) `true` to indicate on the host page that the step is being run
   */
  notifyProgress?: boolean;

  /**
   * (Optional) If the brick is being run in the context of a deployment, if an error occurs in this step an
   * alert email is sent to the admins for the deployment with the brick input.
   *
   * Used as a stopgap/recovery mechanism operations that aren't safe to retry. (For example, sending data to a
   * UiPath queue for execution)
   */
  onError?: {
    alert?: boolean;
  };

  /**
   * Where to execute the brick (default=`self`)
   * @see BrickWindow
   */
  window?: BrickWindow;

  /**
   * The output key (without the preceding "@") to assign the brick output to
   *
   * As of brick API `v2`, the outputKey is required except:
   * - Effect bricks (because they don't produce an output)
   * - The last brick in pipeline
   *
   * @see ApiVersionOptions.explicitDataFlow
   */
  outputKey?: OutputKey;

  /**
   * (Optional) condition expression written in templateEngine for deciding if the step should be run. If not
   * provided, the step is run unconditionally.
   * @see BlockIf
   */
  if?: BlockIf;

  /**
   * (Optional) whether the brick should inherit the current root element, or if it should use the document
   * (default=`inherit`)
   *
   * `element` rootMode added in 1.7.16
   *
   * @see root
   * @since 1.4.0
   */
  rootMode?: "inherit" | "document" | "element";

  /**
   * (Optional) root jQuery/CSS selector or element reference.
   *
   * For rootMode of "inherit" and "document", interpreted as a jQuery/CSS selector. The selector is relative to the
   * `root` that is passed to the pipeline/stage. An error is thrown at runtime if the selector doesn't match exactly
   * one element
   *
   * @see rootMode
   */
  root?: string | ElementReference | Expression;

  /**
   * (Optional) template language to use for rendering the `if` and `config` properties (default=`mustache`)
   * @see config
   * @see if
   */
  templateEngine?: TemplateEngine;

  /**
   * A unique id for the configured brick, used to correlate traces across runs when using the Page Editor.
   *
   * DO NOT SET: generated automatically by the Page Editor when configuring a draft mod component.
   */
  instanceId?: UUID;

  /**
   * Comments added by the mod developer to annotate the brick. Does not affect runtime behavior.
   *
   * @since 1.8.6
   */
  comments?: string;
};

/**
 * A pipeline of bricks to execute sequentially
 */
export type BrickPipeline = BrickConfig[];

/**
 * Which kinds of bricks are allowed in the pipeline
 * @see BrickPipeline
 */
export enum PipelineFlavor {
  AllBricks = "allBricks",
  NoEffect = "noEffect",
  NoRenderer = "noRenderer",
}

/**
 * Defines the position of the brick in the mod component
 * ex. "modComponent.brickPipeline.0.config.body.__value__.0",
 * "modComponent.brickPipeline.0.config.body.0.children.0.config.onClick.__value__.0"
 */
export type BrickPosition = {
  /**
   * The path to the brick relative to the root pipeline
   */
  path: string;
};
