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
import { BlockArg } from "@/core";
import { propertiesToSchema } from "@/validators/generic";

export class Base64Encode extends Transformer {
  defaultOutputKey = "encoded";

  async isPure(): Promise<boolean> {
    return true;
  }

  constructor() {
    super(
      "@pixiebrix/encode/btoa",
      "Encode a string as Base64",
      "Returns an ASCII string containing the Base64 representation of stringToEncode.",
      "faCode"
    );
  }

  inputSchema = propertiesToSchema(
    {
      stringToEncode: {
        type: "string",
        description: "The raw string",
      },
    },
    ["stringToEncode"]
  );

  async transform({ stringToEncode }: BlockArg): Promise<string> {
    return btoa(stringToEncode);
  }
}

export class Base64Decode extends Transformer {
  defaultOutputKey = "decoded";

  constructor() {
    super(
      "@pixiebrix/encode/atob",
      "Decode a Base64 string",
      "Returns an ASCII string containing decoded data from encodedData",
      "faCode"
    );
  }

  inputSchema = propertiesToSchema(
    {
      encodedData: {
        type: "string",
        description: "A binary string contains an base64 encoded data.",
      },
    },
    ["encodedData"]
  );

  async transform({ encodedData }: BlockArg): Promise<string> {
    return btoa(encodedData);
  }
}
