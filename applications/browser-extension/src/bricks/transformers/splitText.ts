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

import { propertiesToSchema } from "@/utils/schemaUtils";

interface SplitArgs {
  text: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

export class SplitText extends TransformerABC {
  override async isPure(): Promise<boolean> {
    return true;
  }

  override defaultOutputKey = "split";

  constructor() {
    super(
      "@pixiebrix/text/split",
      "Split/Chunk Text",
      "Split/chunk text into chunks, e.g., for providing to an LLM",
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      text: {
        type: "string",
        description: "An absolute or relative URL",
      },
      chunkSize: {
        type: "number",
        description: "The size of each chunk, in characters",
        default: 1000,
      },
      chunkOverlap: {
        type: "number",
        description: "The overlap",
        default: 200,
      },
    },
    ["text"],
  );

  override outputSchema: Schema = {
    type: "object",
    properties: {
      documents: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: {
              type: "string",
            },
          },
          required: ["text"],
        },
      },
    },
    required: ["documents"],
  };

  async transform({
    text,
    chunkSize = 1000,
    chunkOverlap = 200,
  }: BrickArgs<SplitArgs>): Promise<unknown> {
    const documents = [];
    let start = 0;
    let end = chunkSize;
    while (start < text.length) {
      documents.push({
        text: text.slice(start, end),
      });
      start = end - chunkOverlap;
      end = start + chunkSize;
    }

    return {
      documents,
    };
  }
}
