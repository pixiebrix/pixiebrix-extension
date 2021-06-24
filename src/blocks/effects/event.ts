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

import { Effect } from "@/types";
import { BlockArg, BlockOptions, Schema } from "@/core";
import { registerBlock } from "@/blocks/registry";

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
    },
    required: ["selector"],
  };

  async effect(
    { selector, event }: BlockArg,
    { logger }: BlockOptions
  ): Promise<void> {
    const $element = $(selector);

    if ($element.length === 0) {
      logger.debug(`Element not found for selector: ${selector}`);
    } else if ($element.length > 1) {
      logger.debug(`Multiple elements found for selector: ${selector}`);
    }

    // Triggers the event. NOTE: the event is not "trusted" as being a user action
    // https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted
    $element.trigger(event);
  }
}

registerBlock(new ElementEvent());
