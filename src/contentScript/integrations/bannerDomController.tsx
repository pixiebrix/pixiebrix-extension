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

import type { UUID } from "@/types/stringTypes";
import { render, unmountComponentAtNode } from "react-dom";
import React from "react";
import LoginBanners from "@/contentScript/integrations/LoginBanners";
import type { DeferredLogin } from "@/contentScript/integrations/deferredLoginTypes";
import {
  SIDEBAR_EASING_FUNCTION,
  SIDEBAR_WIDTH_CSS_PROPERTY,
} from "@/contentScript/sidebarDomControllerLite";
import { MAX_Z_INDEX } from "@/domConstants";

let bannerContainer: HTMLDivElement | null = null;
let dismissLogin: (configId: UUID) => void = null;

/**
 * Mapping from integration configuration id to deferred login.
 */
const deferredLogins = new Map<UUID, DeferredLogin>();

/*
 * Login requests that have been dismissed by the user.
 * When showLoginBanner is called, it will check if the banner has been dismissed before and if so,
 * it will dismiss it again.
 */
const dismissedLoginBanners = new Set<UUID>();

function renderOrUnmountBanners(): void {
  if (!bannerContainer) {
    return;
  }

  if (deferredLogins.size === 0) {
    // Cleanly unmount React component to ensure any listeners are cleaned up.
    // https://react.dev/reference/react-dom/unmountComponentAtNode
    unmountComponentAtNode(bannerContainer);

    bannerContainer.remove();
    bannerContainer = null;
    dismissLogin = null;
    return;
  }

  render(
    <LoginBanners
      deferredLogins={[...deferredLogins.values()]}
      dismissLogin={dismissLogin}
    />,
    bannerContainer,
  );
}

// XXX Remove when MV2 is sunset
const mv2SidebarStyleSupport = {
  // Prevent the sidebar from overlapping the banner
  // SIDEBAR_WIDTH_CSS_PROPERTY is a CSS variable that changes based on the sidebar open state
  width: `calc(100% - var(${SIDEBAR_WIDTH_CSS_PROPERTY}))`,
  marginRight: SIDEBAR_WIDTH_CSS_PROPERTY,
  transition: `width 0.5s ${SIDEBAR_EASING_FUNCTION}`,
} as const;

/**
 * Show a banner for the given integration configuration. Is a no-op if the banner is already showing.
 */
export function showLoginBanner(
  login: DeferredLogin,
  dismissDeferredLogin: (configId: UUID) => void,
): void {
  dismissLogin ??= (configId: UUID) => {
    dismissDeferredLogin(configId);
    dismissedLoginBanners.add(configId);
  };

  if (!bannerContainer) {
    // Create a new banner container
    bannerContainer = document.createElement("div");

    Object.assign(bannerContainer.style, {
      style: "all: initial",
      position: "relative",
      // Same z-index as the sidebar. Does not interfere with the modal.
      zIndex: MAX_Z_INDEX - 1,
      width: "100%",
      ...mv2SidebarStyleSupport,
    });

    // Insert the banner at the top of the body
    document.body.insertBefore(bannerContainer, document.body.firstChild);
  }

  const { id: configId } = login.config;

  if (dismissedLoginBanners.has(configId)) {
    // Previously dismissed, need to dismiss again
    dismissDeferredLogin(configId);
  }

  if (deferredLogins.has(configId)) {
    // Already showing
    return;
  }

  deferredLogins.set(configId, login);

  renderOrUnmountBanners();
}

/**
 * Hide a banner for the given integration configuration. Is a no-op if the banner is not currently showing.
 */
export function hideLoginBanner(integrationConfigId: UUID): void {
  deferredLogins.delete(integrationConfigId);
  renderOrUnmountBanners();
}

/**
 * Hide all login banners. Does NOT cancel their deferred login promises.
 */
export function hideAllLoginBanners(): void {
  dismissedLoginBanners.clear();
  deferredLogins.clear();
  renderOrUnmountBanners();
}
