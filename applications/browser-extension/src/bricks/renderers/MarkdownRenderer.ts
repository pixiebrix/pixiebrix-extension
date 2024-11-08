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

import { RendererABC } from "../../types/bricks/rendererTypes";
import { validateRegistryId } from "../../types/helpers";
import MarkdownLazy from "@/components/Markdown";
import { type BrickArgs, type ComponentRef } from "../../types/runtimeTypes";
import { ADD_IFRAME_CONFIG } from "../../utils/sanitize";
import { propertiesToSchema } from "../../utils/schemaUtils";

class MarkdownRenderer extends RendererABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/markdown");

  constructor() {
    super(
      MarkdownRenderer.BRICK_ID,
      "Markdown Renderer",
      "Render Markdown to sanitized HTML",
    );
  }

  inputSchema = propertiesToSchema(
    {
      markdown: {
        type: "string",
        description: "The Markdown to render",
        format: "markdown",
      },
      /**
       * @since 1.8.5
       */
      allowIFrames: {
        title: "Allow IFrames",
        type: "boolean",
        description:
          "Toggle to allow the iframe tag and generally safe frame attributes",
        default: false,
      },
    },
    ["markdown"],
  );

  async render({
    markdown,
    allowIFrames = false,
  }: BrickArgs<{
    markdown: string;
    allowIFrames?: boolean;
  }>): Promise<ComponentRef> {
    return {
      Component: MarkdownLazy,
      props: {
        markdown,
        purifyConfig: allowIFrames ? ADD_IFRAME_CONFIG : undefined,
      },
    };
  }
}

export default MarkdownRenderer;
