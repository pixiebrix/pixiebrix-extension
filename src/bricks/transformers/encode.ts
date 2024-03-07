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

import { TransformerABC } from "@/types/bricks/transformerTypes";
import { type BrickArgs } from "@/types/runtimeTypes";
import { stringToBase64 } from "uint8array-extras";
import { propertiesToSchema } from "@/utils/schemaUtils";

export class Base64Encode extends TransformerABC {
  override defaultOutputKey = "encoded";

  override async isPure(): Promise<boolean> {
    return true;
  }

  constructor() {
    super(
      "@pixiebrix/encode/btoa",
      "Encode a string as Base64",
      "Returns an ASCII string containing the Base64 representation of stringToEncode.",
    );
  }

  inputSchema = propertiesToSchema(
    {
      stringToEncode: {
        type: "string",
        description: "The raw string",
      },
    },
    ["stringToEncode"],
  );

  async transform({
    stringToEncode,
  }: BrickArgs<{ stringToEncode: string }>): Promise<string> {
    return stringToBase64(stringToEncode);
  }
}

export class Base64Decode extends TransformerABC {
  override defaultOutputKey = "decoded";

  constructor() {
    super(
      "@pixiebrix/encode/atob",
      "Decode a Base64 string",
      "Returns an ASCII string containing decoded data from encodedData",
    );
  }

  inputSchema = propertiesToSchema(
    {
      encodedData: {
        type: "string",
        description: "A binary string contains an base64 encoded data.",
      },
    },
    ["encodedData"],
  );

  async transform({
    encodedData,
  }: BrickArgs<{ encodedData: string }>): Promise<string> {
    return stringToBase64(encodedData);
  }
}
