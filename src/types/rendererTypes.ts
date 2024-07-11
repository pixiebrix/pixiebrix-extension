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
import { type UUID } from "@/types/stringTypes";
import { type Nullishable } from "@/utils/nullishUtils";
import { type Except } from "type-fest";

type BaseRendererPayload = {
  /**
   * A unique id for the content, used control re-rendering (similar to `key` in React)
   */
  key: Nullishable<string>;
  /**
   * The ModComponent that produced the payload.
   * Marked Nullishable as part of the StrictNullChecks migration.
   * TODO: Revisit and determine if modComponentId should be required.
   */
  modComponentId: Nullishable<UUID>;
  /**
   * The ModComponent run that produced the payload
   * @since 1.7.0
   */
  runId: Nullishable<UUID>;
};

export type RendererLoadingPayload = Except<BaseRendererPayload, "runId"> & {
  /**
   * The message to show the user while the renderer run payload is loading
   */
  loadingMessage: string;
};

/**
 * Information required to display a renderer
 */
export type RendererRunPayload = BaseRendererPayload & {
  /**
   * The registry id of the renderer brick, e.g., @pixiebrix/table
   */
  brickId: RegistryId;
  /**
   * The BrickArgs to pass to the renderer
   * @see BrickProps.args
   * @see BrickArgs
   */
  args: unknown;
  /**
   * The context to pass to the renderer
   * @see BlockProps.context
   * @see BlockOptions
   */
  ctxt: unknown;
};

export type RendererErrorPayload = BaseRendererPayload & {
  /**
   * The error message to show in the panel
   */
  // TypeScript was having problems handling the type SerializedError here
  error: unknown;
};
