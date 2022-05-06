/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { BlockConfig } from "@/blocks/types";
import { defaultBlockConfig } from "@/blocks/util";
import { RegistryId, Schema } from "@/core";
import { uuidv4 } from "@/types/helpers";
import { getExampleBlockConfig } from "./exampleBlockConfigs";

export function createNewBlock(
  blockId: RegistryId,
  blockInputSchema?: Schema
): BlockConfig {
  return {
    id: blockId,
    instanceId: uuidv4(),
    config:
      getExampleBlockConfig(blockId) ??
      (blockInputSchema == null ? {} : defaultBlockConfig(blockInputSchema)),
  };
}
