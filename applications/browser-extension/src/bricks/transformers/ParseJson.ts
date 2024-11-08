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

import { TransformerABC } from "../../types/bricks/transformerTypes";
import { type BrickArgs } from "../../types/runtimeTypes";
import { type Schema } from "../../types/schemaTypes";
import { getErrorMessage } from "../../errors/errorHelpers";
import { BusinessError } from "../../errors/businessErrors";
import { sortBy } from "lodash";
import { type JsonValue } from "type-fest";
import { propertiesToSchema } from "../../utils/schemaUtils";

function extractJsonString(content: string): string {
  // https://regex101.com/library/sjOfeq?orderBy=MOST_POINTS&page=3&search=json
  // https://stackoverflow.com/a/63660736
  const objectRegex = /{.*}/g;
  const arrayRegex = /\[.*]/g;

  const objectMatches = [...content.matchAll(objectRegex)];
  const arrayMatches = [...content.matchAll(arrayRegex)];

  const sorted = sortBy(
    [...objectMatches, ...arrayMatches].flatMap((x) => x[0]),
    (x) => -x.length,
  );

  if (sorted.length === 0) {
    throw new Error("No JSON object or array found");
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Just checked length
  return sorted[0]!;
}

function lenientParserFactory(rootParse: typeof JSON.parse): typeof JSON.parse {
  function parse(content: string): JsonValue {
    try {
      return rootParse(content);
    } catch (error) {
      const extracted = extractJsonString(content);
      if (extracted !== content) {
        return parse(extracted);
      }

      throw error;
    }
  }

  return parse;
}

async function getParser({
  allowJson5,
  lenient,
}: {
  allowJson5: boolean;
  lenient: boolean;
}) {
  if (!allowJson5 && !lenient) {
    return JSON.parse;
  }

  const { default: JSON5 } = await import(
    /* webpackChunkName: "json5" */ "json5"
  );

  if (!lenient) {
    return JSON5.parse;
  }

  // Lenient implies allowJson5
  return lenientParserFactory(JSON5.parse);
}

class ParseJson extends TransformerABC {
  constructor() {
    super(
      "@pixiebrix/parse/json",
      "Parse JSON",
      "Parse a JSON string, with JSON5 support",
    );
  }

  override async isPure(): Promise<boolean> {
    return true;
  }

  inputSchema: Schema = propertiesToSchema(
    {
      content: {
        title: "Content",
        type: "string",
        description: "The JSON content",
      },
      allowJson5: {
        title: "Allow JSON5",
        type: "boolean",
        description: "Allow JSON5 syntax (default=true)",
        default: true,
      },
      lenient: {
        title: "Lenient",
        type: "boolean",
        description:
          "Attempt to recover from malformed JSON, e.g., leading/trailing text. Implies Allow JSON5 (default=false)",
        default: false,
      },
    },
    ["content"],
  );

  async transform({
    content,
    allowJson5 = true,
    lenient = false,
  }: BrickArgs<{
    content: string;
    allowJson5?: boolean;
    lenient?: boolean;
  }>): Promise<unknown> {
    const parse = await getParser({ allowJson5, lenient });

    try {
      return parse(content);
    } catch (error) {
      throw new BusinessError(`Error parsing JSON: ${getErrorMessage(error)}`);
    }
  }
}

export default ParseJson;
