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

import { TransformerABC } from "@/types/bricks/transformerTypes";
import { type BrickArgs } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { propertiesToSchema } from "@/validators/generic";
import sanitize from "@/utils/sanitize";
import { BusinessError } from "@/errors/businessErrors";

class ConvertDocument extends TransformerABC {
  constructor() {
    super(
      "@pixiebrix/convert",
      "Convert Document",
      "Convert between document formats (e.g., HTML to Text)",
      "faCode",
    );
  }

  override async isPure(): Promise<boolean> {
    return true;
  }

  defaultOutputKey = "document";

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
    // Default to true if not provided for backwards compatibility
    sanitizeOutput = true,
  }: BrickArgs<{
    input: string;
    sourceFormat: "html" | "markdown";
    targetFormat: "text" | "html";
    sanitizeOutput: boolean;
  }>): Promise<unknown> {
    if (sourceFormat === targetFormat) {
      return {
        output: input,
      };
    }

    if (sourceFormat === "html" && targetFormat === "text") {
      const { convert } = await import(
        /* webpackChunkName: "html-to-text" */ "html-to-text"
      );

      const text = convert(input);

      return {
        output: text,
      };
    }

    if (sourceFormat === "markdown" && targetFormat === "html") {
      const { marked } = await import(
        /* webpackChunkName: "markdown" */ "marked"
      );

      return {
        output: sanitize(String(marked(input))),
      };
    }

    throw new BusinessError("Unsupported conversion");
  }
}

export default ConvertDocument;
