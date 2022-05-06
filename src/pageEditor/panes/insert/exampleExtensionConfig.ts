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

import { BlockConfig, BlockPipeline } from "@/blocks/types";
import { ExtensionPointType } from "@/extensionPoints/types";
import { getExampleBlockConfig } from "@/pageEditor/tabs/editTab/exampleBlockConfigs";
import { uuidv4, validateRegistryId } from "@/types/helpers";

const documentBlockId = validateRegistryId("@pixiebrix/document");

export function getExampleBlockPipeline(
  type: ExtensionPointType
): BlockPipeline {
  if (type === "actionPanel") {
    const documentBlock: BlockConfig = {
      id: documentBlockId,
      instanceId: uuidv4(),
      config: getExampleBlockConfig(documentBlockId),
    };
    return [documentBlock];
  }

  return [];
}
