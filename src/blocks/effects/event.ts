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
import { type BlockArg, type BlockOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import {
  IS_ROOT_AWARE_BRICK_PROPS,
  $safeFindElementsWithRootMode,
} from "@/blocks/rootModeHelpers";

// https://developer.mozilla.org/en-US/docs/Web/Events
const DOM_EVENTS = [
  "auxclick",
  "click",
  "contextmenu",
  "dblclick",
  "mousedown",
  "mouseenter",
  "mouseleave",
  "mousemove",
  "mouseover",
  "mouseout",
  "mouseup",
  "pointer-lockchange",
  "pointerlockerror",
  "select",
  "wheel",
  "error",
  "abort",
  "load",
  "beforeunload",
  "unload",
  "focus",
  "blur",
  "focusin",
  "focusout",
];

export class ElementEvent extends Effect {
  constructor() {
    super(
      "@pixiebrix/dom/trigger-event",
      "Simulate a DOM event",
      "Simulate a DOM element event, e.g., click"
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      selector: {
        type: "string",
        format: "selector",
      },
      event: {
        type: "string",
        examples: DOM_EVENTS,
      },
      ...IS_ROOT_AWARE_BRICK_PROPS,
    },
    required: ["event"],
  };

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  async effect(
    { selector, isRootAware, event }: BlockArg,
    { logger, root }: BlockOptions
  ): Promise<void> {
    const $elements = $safeFindElementsWithRootMode({
      selector,
      isRootAware,
      root,
      blockId: this.id,
    });

    if ($elements.length === 0) {
      logger.debug("No elements found", {
        selector,
      });
    } else if ($elements.length > 1) {
      logger.debug("Multiple elements found", {
        selector,
      });
    }

    // Trigger the event (without jQuery #1869)
    // NOTE: the event is not "trusted" as being a user action
    // https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted
    for (const element of $elements) {
      if (event === "click") {
        if (element instanceof Document) {
          logger.warn("Cannot call 'click' on document");
        } else {
          // Trigger a proper MouseEvent on the most common event
          element.click();
        }
      } else {
        element.dispatchEvent(new Event(event, { bubbles: true }));
      }
    }
  }
}
