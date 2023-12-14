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

import { RendererABC } from "@/types/bricks/rendererTypes";
import { propertiesToSchema } from "@/validators/generic";
import sanitize from "@/utils/sanitize";
import { type BrickArgs } from "@/types/runtimeTypes";
import { type SafeHTML } from "@/types/stringTypes";
import { validateRegistryId } from "@/types/helpers";

class HtmlRenderer extends RendererABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/html");

  constructor() {
    super(
      HtmlRenderer.BRICK_ID,
      "HTML Renderer",
      "Render HTML, sanitizing it first",
    );
  }

  inputSchema = propertiesToSchema({
    html: {
      title: "HTML",
      type: "string",
      description: "The HTML string to render",
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
  });

  async render({
    html,
    allowIFrames = false,
  }: BrickArgs<{ html: string; allowIFrames?: boolean }>): Promise<SafeHTML> {
    if (allowIFrames) {
      // `src`, `title`, and similar attributes are already allowed
      // https://github.com/cure53/DOMPurify/wiki/Default-TAGs-ATTRIBUTEs-allow-list-&-blocklist#default-allow-listsblocklists
      return sanitize(html, {
        ADD_TAGS: ["iframe"],
        ADD_ATTR: ["allowfullscreen", "frameborder", "scrolling"],
      });
    }

    return sanitize(html);
  }
}

export default HtmlRenderer;
