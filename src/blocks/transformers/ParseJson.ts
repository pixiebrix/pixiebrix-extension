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

import { Transformer } from "@/types";
import { BlockArg, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { getErrorMessage } from "@/errors/errorHelpers";
import { BusinessError } from "@/errors/businessErrors";

class ParseJson extends Transformer {
  constructor() {
    super(
      "@pixiebrix/parse/json",
      "Parse JSON",
      "Parse a JSON string",
      "faCode"
    );
  }

  override async isPure(): Promise<boolean> {
    return true;
  }

  inputSchema: Schema = propertiesToSchema({
    content: {
      type: "string",
      description: "The JSON content",
    },
  });

  async transform({ content }: BlockArg): Promise<unknown> {
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new BusinessError(`Error parsing JSON: ${getErrorMessage(error)}`);
    }
  }
}

export default ParseJson;
