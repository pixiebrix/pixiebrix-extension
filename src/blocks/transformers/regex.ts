/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { type BlockArg, type Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { isArray, unary } from "lodash";
import { PropError } from "@/errors/businessErrors";
import { type BlockConfig } from "@/blocks/types";
import { extractRegexLiteral } from "@/analysis/analysisVisitors/regexAnalysis";
import { isNunjucksExpression } from "@/runtime/mapArgs";

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

  override outputSchema: Schema = {
    oneOf: [
      {
        type: "object",
        additionalProperties: {
          type: "string",
        },
      },
      {
        type: "array",
        items: {
          type: "object",
          additionalProperties: {
            type: "string",
          },
        },
      },
    ],
  };

  override getOutputSchema(config: BlockConfig): Schema | undefined {
    const pattern = extractRegexLiteral(config);
    const { input } = config.config;

    if (!pattern) {
      return this.outputSchema;
    }

    if (
      !(
        typeof input === "string" ||
        isNunjucksExpression(input) ||
        isArray(input)
      )
    ) {
      // Don't have enough information to determine if output will be an array or object
      return this.outputSchema;
    }

    try {
      // eslint-disable-next-line no-new -- evaluating for type error
      new RegExp(pattern);
    } catch {
      return this.outputSchema;
    }

    // Create new regex on each analysis call to avoid state issues with test
    const namedCapturedGroupRegex = /\(\?<(\S+)>.*?\)/g;

    const namedGroups: string[] = [
      ...pattern.matchAll(namedCapturedGroupRegex),
    ].map((x) => x[1]);

    const itemSchema: Schema = {
      type: "object",
      properties: Object.fromEntries(
        namedGroups.map((name) => [name, { type: "string" }])
      ),
    };

    if (isArray(input)) {
      return {
        type: "array",
        items: itemSchema,
      };
    }

    return itemSchema;
  }

  async transform({
    regex,
    input,
  }: BlockArg): Promise<
    Record<string, string> | Array<Record<string, string>>
  > {
    let compiled: RegExp;

    try {
      // eslint-disable-next-line security/detect-non-literal-regexp -- It's what the brick is about
      compiled = new RegExp(regex);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new PropError(error.message, this.id, "regex", regex);
      }

      throw error;
    }

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
