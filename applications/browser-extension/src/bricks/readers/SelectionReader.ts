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

import { ReaderABC } from "@/types/bricks/readerTypes";
import selectionController from "@/utils/selectionController";
import { type Schema } from "@/types/schemaTypes";
import { type JsonObject } from "type-fest";

export class SelectionReader extends ReaderABC {
  constructor() {
    super(
      "@pixiebrix/selection",
      "Selection Reader",
      "Data about the current selection",
    );
  }

  override defaultOutputKey = "selection";

  override async isRootAware(): Promise<boolean> {
    return false;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  override outputSchema: Schema = {
    type: "object",
    properties: {
      selectionText: {
        type: "string",
        description: "The text for the current selection, if any.",
      },
    },
  };

  async read(): Promise<JsonObject> {
    return {
      selectionText: selectionController.get(),
    };
  }
}
