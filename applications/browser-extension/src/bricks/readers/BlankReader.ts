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

import { ReaderABC } from "../../types/bricks/readerTypes";
import { type Schema } from "../../types/schemaTypes";
import type { PlatformCapability } from "../../platform/capabilities";

export class BlankReader extends ReaderABC {
  constructor() {
    super("@pixiebrix/blank", "Reader that returns no data");
  }

  async read() {
    return {};
  }

  override outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {},
    additionalProperties: false,
  };

  override async isRootAware(): Promise<boolean> {
    return false;
  }

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return [];
  }

  async isAvailable() {
    return true;
  }

  override async isPure(): Promise<boolean> {
    return true;
  }
}
