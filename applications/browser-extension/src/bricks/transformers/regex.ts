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
import { type Schema } from "@/types/schemaTypes";
import { compact, isArray, unary } from "lodash";
import { PropError } from "@/errors/businessErrors";
import { type BrickConfig } from "@/bricks/types";
import { extractRegexLiteral } from "@/analysis/analysisVisitors/regexAnalysis";

import { isNunjucksExpression } from "@/utils/expressionUtils";
import { propertiesToSchema } from "@/utils/schemaUtils";

function extractNamedCaptureGroups(pattern: string): string[] {
  // Create new regex on each analysis call to avoid state issues with test
  const namedCapturedGroupRegex = /\(\?<(\S+)>.*?\)/g;

  return compact(
    [...pattern.matchAll(namedCapturedGroupRegex)].map((x) => x[1]),
  );
}

export class RegexTransformer extends TransformerABC {
  override async isPure(): Promise<boolean> {
    return true;
  }

  constructor() {
    super(
      "@pixiebrix/regex",
      "Regex Extractor",
      "Extract data using a Regex (regular expression)",
    );
  }

  override defaultOutputKey = "extracted";

  inputSchema: Schema = propertiesToSchema(
    {
      regex: {
        title: "Regular Expression",
        type: "string",
        description:
          "A regular expression pattern. Supports [named capture groups](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Named_capturing_group) to extract multiple properties.",
      },
      input: {
        title: "Text Input(s)",
        oneOf: [
          { type: ["string", "null"] },
          { type: "array", items: { type: ["string", "null"] } },
        ],
        description:
          "The text to run the regular expression against. If an array is provided, the regular expression will be run against each item.",
      },
      ignoreCase: {
        title: "Ignore Case",
        type: "boolean",
        description:
          "Toggle on perform a case-insensitive match. Defaults to false.",
        default: false,
      },
    },
    ["regex", "input"],
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

  override getOutputSchema(config: BrickConfig): Schema | undefined {
    const pattern = extractRegexLiteral(config);
    const { input } = config.config;

    if (!pattern) {
      return this.outputSchema;
    }

    if (
      typeof input !== "string" &&
      !isNunjucksExpression(input) &&
      !isArray(input)
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

    const namedGroups = extractNamedCaptureGroups(pattern);

    const itemSchema: Schema =
      namedGroups.length > 0
        ? {
            type: "object",
            properties: Object.fromEntries(
              namedGroups.map((name) => [name, { type: "string" }]),
            ),
          }
        : {
            type: "object",
            properties: {
              match: { type: "string" },
            },
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
    ignoreCase = false,
  }: BrickArgs<{
    regex: string | RegExp;
    input: string | null | Array<string | null>;
    ignoreCase?: boolean;
  }>): Promise<
    Record<string, string> | Array<Record<string, string> | null> | null
  > {
    let compiled: RegExp;

    try {
      // eslint-disable-next-line security/detect-non-literal-regexp -- It's what the brick is about
      compiled = new RegExp(regex, ignoreCase ? "i" : undefined);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new PropError(error.message, this.id, "regex", regex);
      }

      throw error;
    }

    const extract = (string: string | null) => {
      if (string == null) {
        return null;
      }

      const match = compiled.exec(string);

      if (match && match.groups == null) {
        // No named groups, return the global match
        return { match: match[0] };
      }

      return match?.groups ?? {};
    };

    return Array.isArray(input) ? input.map(unary(extract)) : extract(input);
  }
}
