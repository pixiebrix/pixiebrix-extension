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
import { castArray } from "lodash";
import { stemmer } from "stemmer";
import { propertiesToSchema } from "@/utils/schemaUtils";
import { assertNotNullish } from "@/utils/nullishUtils";

/**
 * A text search match.
 */
interface Match {
  /**
   * The query that matched.
   */
  query: string;
  /**
   * The original text that matched.
   */
  text: string;
  /**
   * The index of the match in the original text.
   */
  startIndex: number;
  /**
   * The length of the match in the original text.
   */
  length: number;
}

/**
 * Stem each word and create a map of start index in the stemmed text to the original text
 * @internal
 */
export function createStemMap(haystack: string) {
  const stemMap = new Map<number, number>();

  const originalWords = haystack.split(" ");

  let originalIndex = 0;
  let transformedIndex = 0;

  const stemmedWords: string[] = [];

  for (const word of originalWords) {
    const stemmed = stemmer(word);
    stemmedWords.push(stemmed);

    stemMap.set(transformedIndex, originalIndex);

    // Account for trailing space
    originalIndex += word.length + 1;
    transformedIndex += stemmed.length + 1;
  }

  return {
    text: stemmedWords.join(" "),
    indexMap: stemMap,
  };
}

/**
 * Return all indices of `needle` in `haystack`. Must match the beginning of a word.
 */
function indexOfAll(needle: string, haystack: string): number[] {
  let lastMatch = -1;

  const matches: number[] = [];

  do {
    lastMatch = haystack.indexOf(needle, lastMatch + 1);
    if (
      lastMatch >= 0 &&
      (lastMatch === 0 || haystack.at(lastMatch - 1) === " ")
    ) {
      matches.push(lastMatch);
    }
  } while (lastMatch !== -1);

  return matches;
}

function searchStemmed(needles: string[], haystack: string): Match[] {
  const stemmedNeedles = needles.map((needle) => ({
    originalNeedle: needle,
    stemmedNeedle: stemmer(needle),
  }));

  const { text: stemmedHaystack, indexMap } = createStemMap(haystack);

  const matches: Match[] = [];

  for (const { originalNeedle, stemmedNeedle } of stemmedNeedles) {
    for (const stemmedIndex of indexOfAll(stemmedNeedle, stemmedHaystack)) {
      const originalStartIndex = indexMap.get(stemmedIndex);
      assertNotNullish(originalStartIndex, "Original start index is null");

      const transformedEndIndex = stemmedIndex + stemmedNeedle.length;

      let originalEndIndex;

      if (transformedEndIndex >= stemmedHaystack.length) {
        originalEndIndex = haystack.length;
      } else {
        const value = indexMap.get(transformedEndIndex + 1);
        assertNotNullish(
          value,
          `Index ${transformedEndIndex + 1} not found in indexMap`,
        );
        originalEndIndex = value - 1;
      }

      const originalText = haystack.slice(originalStartIndex, originalEndIndex);

      matches.push({
        query: originalNeedle,
        text: originalText,
        startIndex: originalStartIndex,
        length: originalText.length,
      });
    }
  }

  return matches;
}

function search(needles: string[], haystack: string): Match[] {
  const matches: Match[] = [];

  for (const needle of needles) {
    for (const startIndex of indexOfAll(needle, haystack)) {
      matches.push({
        query: needle,
        text: haystack.slice(startIndex, startIndex + needle.length),
        startIndex,
        length: needle.length,
      });
    }
  }

  return matches;
}

export class SearchText extends TransformerABC {
  constructor() {
    super(
      "@pixiebrix/text/search",
      "Search Text",
      "Search for word and/or phrase(s) in text",
    );
  }

  override defaultOutputKey = "matches";

  override async isPure(): Promise<boolean> {
    return true;
  }

  inputSchema: Schema = propertiesToSchema(
    {
      text: {
        title: "Text",
        type: "string",
        description: "The text to search",
      },
      query: {
        title: "Query",
        description: "A search query, or array of queries",
        oneOf: [
          {
            type: "string",
            title: "Query",
            description: "The search query",
          },
          {
            type: "array",
            title: "Queries",
            description: "The search queries",
            items: {
              type: "string",
            },
          },
        ],
      },
      stemWords: {
        title: "Stem",
        type: "boolean",
        description: "Whether to stem the text and query before searching",
        default: false,
      },
    },
    ["text", "query"],
  );

  override outputSchema: Schema = {
    type: "object",
    properties: {
      matches: {
        type: "array",
        title: "Matches",
        description: "The matches found in the text",
        items: {
          type: "object",
          properties: {
            query: {
              type: "string",
              title: "Query",
            },
            text: {
              type: "string",
              title: "Text",
            },
            startIndex: {
              type: "number",
              title: "Start Index",
            },
            length: {
              type: "number",
              title: "Length",
            },
          },
        },
      },
    },
    required: ["matches"],
  };

  async transform({
    text,
    query,
    stemWords = false,
  }: BrickArgs<{
    text: string;
    query: string | string[];
    stemWords: boolean;
  }>): Promise<unknown> {
    let matches;

    if (stemWords) {
      matches = searchStemmed(castArray(query), text);
    } else {
      matches = search(castArray(query), text);
    }

    return { matches };
  }
}
