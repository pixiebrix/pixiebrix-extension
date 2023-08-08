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
import { type Schema } from "@/types/schemaTypes";
import { propertiesToSchema } from "@/validators/generic";
import { BusinessError } from "@/errors/businessErrors";
import { type BrickOptions } from "@/types/runtimeTypes";

export class Readable extends TransformerABC {
  constructor() {
    super(
      "@pixiebrix/extract/readable",
      "Extract Readable Content",
      "Extract the readable content from a web page",
      "faCode"
    );
  }

  override async isPure(): Promise<boolean> {
    // Technically is not pure, because value depends on document state. But it generally won't change
    return true;
  }

  override async isRootAware(): Promise<boolean> {
    // Is root aware, but only document is supported
    return true;
  }

  inputSchema: Schema = propertiesToSchema({});

  override outputSchema: Schema = propertiesToSchema({
    content: {
      type: "string",
      description: "HTML string of processed article content",
    },
    textContent: {
      type: "string",
      description:
        "Text content of the article, with all the HTML tags removed",
    },
    length: {
      type: "number",
      description: "Length of an article, in characters",
    },
    lang: {
      type: "string",
      description: "Language of the article",
    },
  });

  async transform(_args: never, { root }: BrickOptions): Promise<unknown> {
    if (root !== document) {
      throw new BusinessError("Only document target is supported");
    }

    const { Readability } = await import(
      /* webpackChunkName: "readability" */ "@mozilla/readability"
    );

    // https://github.com/mozilla/readability#parse
    const documentClone = document.cloneNode(true);

    try {
      return new Readability(documentClone as Document).parse();
    } catch {
      throw new BusinessError("Document is not readable");
    }
  }
}
