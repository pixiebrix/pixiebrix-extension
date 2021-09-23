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

import { OutputKey, RegistryId, TemplateEngine, UUID } from "@/core";
import { UnknownObject } from "@/types";

export interface Availability {
  matchPatterns?: string | string[];
  selectors?: string | string[];
}

export type ReaderConfig =
  | RegistryId
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- Record<> doesn't allow labelled keys
  | { [key: string]: ReaderConfig }
  | ReaderConfig[];

export interface BlockConfig {
  id: RegistryId;

  /**
   * (Optional) human-readable label for the step. Shown in the progress indicator
   */
  label?: string;

  /**
   * (Optional) indicate the step is being run in the interface
   */
  notifyProgress?: boolean;

  onError?: {
    alert?: boolean;
  };

  window?: "self" | "opener" | "target" | "broadcast" | "remote";

  outputKey?: OutputKey;

  /**
   * (Optional) condition expression written in templateEngine for deciding if the step should be run. If not
   * provided, the step is run unconditionally.
   */
  if?: string | boolean | number;

  /**
   * (Optional) root selector for reader
   */
  root?: string;

  /**
   * (Optional) template language to use for rendering the if and config properties. Default is mustache
   */
  templateEngine?: TemplateEngine;

  config: UnknownObject;

  /**
   * A unique id for the configured block, used to correlate traces across runs when using the Page Editor.
   *
   * DO NOT SET: generated automatically by the Page Editor when configuring a dynamic element.
   */
  instanceId?: UUID;
}

export type BlockPipeline = BlockConfig[];
