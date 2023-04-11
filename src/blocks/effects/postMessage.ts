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

import { Effect } from "@/types/blocks/effectTypes";
import { type BlockArgs, type BlockOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { $safeFindElementsWithRootMode } from "@/blocks/rootModeHelpers";
import { type UnknownObject } from "@/types/objectTypes";
import { PropError } from "@/errors/businessErrors";

class PostMessageEffect extends Effect {
  // https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage

  constructor() {
    super(
      "@pixiebrix/dom/post-message",
      "Post message to a frame",
      "Post a message to an iframe on the page"
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      selector: {
        type: "string",
        format: "selector",
        description: "The selector of the iframe to post the message to",
      },
      message: {
        type: "object",
        description: "Data to be sent to the other window.",
        additionalProperties: true,
      },
      targetOrigin: {
        type: "string",
        description:
          'Specifies what the origin of this window must be for the event to be dispatched, either as the literal string "*" (indicating no preference) or as a URI',
      },
    },
    required: ["message"],
  };

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  async effect(
    {
      selector,
      message,
      targetOrigin = "*",
    }: BlockArgs<{
      selector?: string;
      message: UnknownObject;
      targetOrigin?: string;
    }>,
    { logger, root }: BlockOptions
  ): Promise<void> {
    const $elements = $safeFindElementsWithRootMode({
      selector,
      isRootAware: true,
      root,
      blockId: this.id,
    });

    for (const element of $elements) {
      if (!(element instanceof HTMLIFrameElement)) {
        throw new PropError(
          "Element is not an iframe",
          this.id,
          "selector",
          selector
        );
      }

      element.contentWindow.postMessage(message, targetOrigin);
    }
  }
}

export default PostMessageEffect;
