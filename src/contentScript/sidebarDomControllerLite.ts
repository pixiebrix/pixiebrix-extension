/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

/**
 * @file This file MUST not have dependencies as it's meant to be tiny
 * and imported by browserActionInstantHandler.ts
 */

import { MAX_Z_INDEX, PANEL_FRAME_ID } from "@/common";
import shadowWrap from "@/utils/shadowWrap";

export const SIDEBAR_WIDTH_CSS_PROPERTY = "--pb-sidebar-width";
const ORIGINAL_MARGIN_CSS_PROPERTY = "--pb-original-margin-right";

const html = globalThis.document?.documentElement;
const SIDEBAR_WIDTH_PX = 400;

function storeOriginalCSSOnce() {
  if (html.style.getPropertyValue(ORIGINAL_MARGIN_CSS_PROPERTY)) {
    return;
  }

  // Store the original margin so it can be reused in future calculations. It must also persist across sessions
  html.style.setProperty(
    ORIGINAL_MARGIN_CSS_PROPERTY,
    getComputedStyle(html).getPropertyValue("margin-right")
  );

  // Make margin dynamic so it always follows the original margin AND the sidebar width, if open
  html.style.setProperty(
    "margin-right",
    `calc(var(${ORIGINAL_MARGIN_CSS_PROPERTY}) + var(${SIDEBAR_WIDTH_CSS_PROPERTY}))`
  );
}

function setSidebarWidth(pixels: number): void {
  html.style.setProperty(SIDEBAR_WIDTH_CSS_PROPERTY, CSS.px(pixels));
}

const getSidebar = (): Element => document.querySelector(`#${PANEL_FRAME_ID}`);

export const isSidebarFrameVisible = (): boolean => Boolean(getSidebar());

/** Removes the element; Returns false if no element was found */
export function removeSidebarFrame(): boolean {
  const sidebar = getSidebar();
  if (sidebar) {
    sidebar.remove();
    setSidebarWidth(0);
  }

  return Boolean(sidebar);
}

/** Inserts the element; Returns false if it already existed */
export function insertSidebarFrame(): boolean {
  if (isSidebarFrameVisible()) {
    return false;
  }

  storeOriginalCSSOnce();
  const nonce = crypto.randomUUID();
  const actionURL = browser.runtime.getURL("sidebar.html");

  setSidebarWidth(SIDEBAR_WIDTH_PX);

  const iframe = document.createElement("iframe");
  iframe.src = `${actionURL}?nonce=${nonce}`;

  Object.assign(iframe.style, {
    position: "fixed",
    top: 0,
    right: 0,
    // `-1` keeps it under the QuickBar #4130
    zIndex: MAX_Z_INDEX - 1,

    // Note that it can't use the variable because the frame is in the shadow DOM
    width: CSS.px(SIDEBAR_WIDTH_PX),
    height: "100%",
    border: 0,
    borderLeft: "1px solid lightgray",

    // Note that it can't use our CSS variables because this element lives on the host
    background: "#efe8fb",
  });

  const wrapper = shadowWrap(iframe);
  wrapper.id = PANEL_FRAME_ID;
  html.append(wrapper);

  iframe.animate([{ translate: "50%" }, { translate: 0 }], {
    duration: 500,
    easing: "cubic-bezier(0.23, 1, 0.32, 1)",
  });

  return true;
}

export function toggleSidebarFrame(): boolean {
  if (isSidebarFrameVisible()) {
    removeSidebarFrame();
    return false;
  }

  insertSidebarFrame();
  return true;
}
