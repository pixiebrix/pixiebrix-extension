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

import {
  MAX_Z_INDEX,
  PIXIEBRIX_TOOLTIPS_CONTAINER_CLASS,
} from "@/domConstants";
import { onContextInvalidated } from "webext-events";

/**
 * Attaches a tooltip container to the DOM.
 *
 * Having a separate container instead of attaching to the body directly improves performance, see:
 * https://popper.js.org/docs/v2/performance/#attaching-elements-to-the-dom
 */
export function ensureTooltipsContainer(): Element {
  let container = document.querySelector(
    `.${PIXIEBRIX_TOOLTIPS_CONTAINER_CLASS}`,
  );
  if (!container) {
    container = document.createElement("div");
    container.className = PIXIEBRIX_TOOLTIPS_CONTAINER_CLASS;
    document.body.append(container);
    onContextInvalidated.addListener(() => {
      container?.remove();
    });
  }

  return container;
}

/**
 * Factory to create a new popover/tooltip element.
 *
 * Suitable for use with ShadowDOM content. (It uses max-content for width/height.). See popoverFactory for displaying
 * iframes.
 *
 * @see ensureTooltipsContainer
 * @see popoverFactory
 * @return the tooltip HTMLElement
 */
// Currently using the tooltip terminology to match the filename, but will likely switch to popover in the future
// to match the web popover API terminology.
export function tooltipFactory(): HTMLElement {
  const container = ensureTooltipsContainer();

  const popover = document.createElement("div");
  // TODO: figure out how to use with the popover API. Just setting "popover" attribute doesn't place the element on
  //  the top layer. We need to call showPopover() on it but also make positioning work with
  //  floating UI so we can target a virtual element (e..g, cursor position) with offset.
  //  See https://github.com/floating-ui/floating-ui/issues/1842
  // https://developer.chrome.com/blog/introducing-popover-api
  // https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
  popover.setAttribute("popover", "manual");
  popover.style.setProperty("z-index", (MAX_Z_INDEX - 1).toString());

  // Must be set before positioning: https://floating-ui.com/docs/computeposition#initial-layout
  popover.style.setProperty("position", "fixed");
  popover.style.setProperty("width", "max-content");
  popover.style.setProperty("height", "max-content");
  popover.style.setProperty("top", "0");
  popover.style.setProperty("left", "0");
  // Override Chrome's base styles for [popover] attribute and provide a consistent look across applications that
  // override the browser defaults (e.g., Zendesk)
  popover.style.setProperty("margin", "0");
  popover.style.setProperty("padding", "0");
  popover.style.setProperty("border-radius", "5px");
  // Can't use colors file because the element is being rendered directly on the host
  popover.style.setProperty("background-color", "#ffffff"); // $S0 color
  popover.style.setProperty("border", "2px solid #a8a1b4"); // $N200 color

  container.append(popover);

  return popover;
}
