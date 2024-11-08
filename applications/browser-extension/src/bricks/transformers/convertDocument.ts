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
import sanitize from "../../utils/sanitize";
import { BusinessError } from "../../errors/businessErrors";
import { propertiesToSchema } from "../../utils/schemaUtils";

async function convert({
  input,
  sourceFormat,
  targetFormat,
}: {
  input: string;
  sourceFormat: "html" | "markdown";
  targetFormat: "text" | "html";
}): Promise<string> {
  if (sourceFormat === targetFormat) {
    return input;
  }

  if (sourceFormat === "html" && targetFormat === "text") {
    const { convert: htmlToText } = await import(
      /* webpackChunkName: "html-to-text" */ "html-to-text"
    );

    return htmlToText(input);
  }

  if (sourceFormat === "markdown" && targetFormat === "html") {
    const { marked } = await import(
      /* webpackChunkName: "markdown" */ "marked"
    );

    return sanitize(String(marked(input)));
  }

  if (sourceFormat === "markdown" && targetFormat === "text") {
    // Chain the conversions
    const html = await convert({
      input,
      sourceFormat: "markdown",
      targetFormat: "html",
    });

    return convert({
      input: html,
      sourceFormat: "html",
      targetFormat: "text",
    });
  }

  throw new BusinessError("Unsupported conversion");
}

class ConvertDocument extends TransformerABC {
  constructor() {
    super(
      "@pixiebrix/convert",
      "Convert Document",
      "Convert between document formats (e.g., HTML to Text)",
    );
  }

  override async isPure(): Promise<boolean> {
    return true;
  }

  override defaultOutputKey = "document";

  inputSchema: Schema = propertiesToSchema(
    {
      input: {
        title: "Document",
        type: "string",
        description: "The input document",
      },
      sourceFormat: {
        title: "Source Format",
        type: "string",
        description: "The input document format",
        enum: ["html", "markdown"],
      },
      targetFormat: {
        title: "Target Format",
        type: "string",
        description: "The target document format",
        enum: ["text", "html"],
      },
    },
    ["input", "sourceFormat", "targetFormat"],
  );

  override outputSchema: Schema = {
    properties: {
      output: {
        title: "Output",
        description: "The converted document",
      },
    },
    required: ["output"],
  };

  async transform({
    input,
    sourceFormat,
    targetFormat,
  }: BrickArgs<{
    input: string;
    sourceFormat: "html" | "markdown";
    targetFormat: "text" | "html";
  }>): Promise<unknown> {
    const output = await convert({
      input,
      sourceFormat,
      targetFormat,
    });

    return {
      output,
    };
  }
}

export default ConvertDocument;
