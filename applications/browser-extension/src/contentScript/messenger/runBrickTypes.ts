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

import { type MessageContext } from "../../types/loggerTypes";
import { type RegistryId } from "../../types/registryTypes";
import { type BrickArgs, type RunMetadata } from "../../types/runtimeTypes";
import { type Availability } from "../../types/availabilityTypes";

/**
 * @see BrickOptions
 */
export interface RemoteBrickOptions {
  /**
   * Available variables for the brick execution.
   */
  ctxt: unknown;
  /**
   * Run metadata for the brick execution.
   */
  meta: RunMetadata;
  /**
   * Logging context for the brick execution.
   */
  messageContext: MessageContext;
  maxRetries?: number;
  isAvailable?: Availability;
}

export interface RunBrickRequest {
  sourceTabId?: number;
  nonce?: string;
  blockId: RegistryId;
  blockArgs?: BrickArgs;
  options: RemoteBrickOptions;
}
