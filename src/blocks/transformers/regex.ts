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
import { unary } from "lodash";

export class RegexTransformer extends Transformer {
  override async isPure(): Promise<boolean> {
    return true;
  }

  constructor() {
    super(
      "@pixiebrix/regex",
      "Regex Extractor",
      "Extract data using a Regex (regular expression)",
      "faCode"
    );
  }

  defaultOutputKey = "extracted";

  inputSchema: Schema = propertiesToSchema(
    {
      regex: {
        type: "string",
      },
      input: {
        oneOf: [
          { type: ["string", "null"] },
          { type: "array", items: { type: ["string", "null"] } },
        ],
      },
      ignoreCase: {
        type: "boolean",
      },
    },
    ["regex", "input"]
  );

  async transform({
    regex,
    input,
  }: BlockArg): Promise<
    Record<string, string> | Array<Record<string, string>>
  > {
    // eslint-disable-next-line security/detect-non-literal-regexp -- It's what the brick is about
    const compiled = new RegExp(regex);

    const extract = (x: string | null) => {
      if (x == null) {
        return null;
      }

      const match = compiled.exec(x);
      // Console.debug(`Search for ${regex} in ${x}`, match);
      return match?.groups ?? {};
    };

    return Array.isArray(input) ? input.map(unary(extract)) : extract(input);
  }
}
