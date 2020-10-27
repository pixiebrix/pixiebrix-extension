/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Renderer } from "@/types";
import marked from "marked";
import createDOMPurify, { DOMPurifyI } from "dompurify";
import { registerBlock } from "@/blocks/registry";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg } from "@/core";

export class Markdown extends Renderer {
  private DOMPurify: DOMPurifyI;

  constructor() {
    super(
      "@pixiebrix/markdown",
      "Render Markdown",
      "Render Markdown to sanitized HTML"
    );
  }

  inputSchema = propertiesToSchema({
    markdown: {
      type: "string",
      description: "The Markdown to render",
    },
  });

  async render({ markdown }: BlockArg) {
    if (!this.DOMPurify) {
      this.DOMPurify = createDOMPurify(window);
    }
    return this.DOMPurify.sanitize(marked(markdown));
  }
}

registerBlock(new Markdown());
