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

import {
  Expression,
  OutputKey,
  RegistryId,
  TemplateEngine,
  UUID,
} from "@/core";
import { UnknownObject } from "@/types";

export type Availability = {
  matchPatterns?: string | string[];
  selectors?: string | string[];
};

/**
 * Availability with consistent shape
 * @see Availability
 */
export type NormalizedAvailability = {
  matchPatterns?: string[];
  selectors?: string[];
};

export type ReaderConfig =
  | RegistryId
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- Record<> doesn't allow labelled keys
  | { [key: string]: ReaderConfig }
  | ReaderConfig[];

/**
 * Where to execute the brick
 * - self: the current tab
 * - opener: the tab that opened the current tab
 * - target: the last tab that the current tab opened
 * - broadcast: all tabs that PixieBrix has access to (the result is returned as an array)
 * - remote: the server (currently only support identity, get, and http bricks)
 */
export type BlockWindow = "self" | "opener" | "target" | "broadcast" | "remote";

/**
 * A block configuration to be executed by the PixieBrix runtime.
 * @see runStage
 * @see reducePipeline
 */
export type BlockConfig = {
  /**
   * The registry id of the configured block
   */
  id: RegistryId;

  /**
   * The configuration of the block
   */
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
   * alert email is send to the admins for the deployment with the brick input.
   *
   * Used as a stopgap/recovery mechanism operations that aren't safe to retry. (For example, sending data to a
   * UiPath queue for execution)
   */
  onError?: {
    alert?: boolean;
  };

  /**
   * Where to execute the brick (default=`self`)
   * @see BlockWindow
   */
  window?: BlockWindow;

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
   */
  if?: string | boolean | number | Expression;

  /**
   * (Optional) whether the block should inherit the current root element, or if it should use the document
   * (default=`inherit`)
   *
   * @see root
   * @since 1.4.0
   */
  rootMode?: "inherit" | "document";

  /**
   * (Optional) root JQuery/CSS selector. The selector is relative to the `root` that is passed to the pipeline/stage.
   *
   * An error is thrown at runtime if the selector doesn't match exactly one argument
   * @see rootMode
   */
  root?: string;

  /**
   * (Optional) template language to use for rendering the `if` and `config` properties (default=`mustache`)
   * @see config
   * @see if
   */
  templateEngine?: TemplateEngine;

  /**
   * A unique id for the configured block, used to correlate traces across runs when using the Page Editor.
   *
   * DO NOT SET: generated automatically by the Page Editor when configuring a dynamic element.
   */
  instanceId?: UUID;
};

/**
 * A pipeline of blocks to execute sequentially
 */
export type BlockPipeline = BlockConfig[];
