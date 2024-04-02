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
 * @returns the tooltip HTMLElement
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

  Object.assign(popover.style, {
    "z-index": (MAX_Z_INDEX - 1).toString(),
    // Must be set before positioning: https://floating-ui.com/docs/computeposition#initial-layout
    position: "fixed",
    width: "max-content",
    height: "max-content",
    top: "0",
    left: "0",
    // Override Chrome's base styles for [popover] attribute and provide a consistent look across applications that
    // override the browser defaults (e.g., Zendesk)
    margin: "0",
    padding: "0",
    // Can't use colors file because the element is being rendered directly on the host
    // Design reference: https://www.figma.com/file/0FSyxGoz2Pk1gtvrzWNe7G/Business-User-Onboarding-Mods?type=design&node-id=241-2275&mode=design&t=3mXfdNhsvsgVm2zO-0
    "background-color": "#ffffff",
    "border-radius": "4px",
    border: "1px solid #DEDBE3",
    "box-shadow": "0px 4px 8px -4px rgba(56, 51, 66, 0.16)",
  });

  container.append(popover);

  return popover;
}
