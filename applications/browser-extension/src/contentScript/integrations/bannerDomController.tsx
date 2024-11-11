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
import { MAX_Z_INDEX } from "@/domConstants";

let bannerContainer: HTMLDivElement | null = null;
let dismissLogin: ((configId: UUID) => void) | null = null;

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
  if (!bannerContainer || !dismissLogin) {
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
    bannerContainer = document.createElement("div");

    Object.assign(bannerContainer.style, {
      all: "initial",
      position: "relative",
      width: "100%",
      // `-1` keeps it under the QuickBar
      zIndex: MAX_Z_INDEX - 1,
    });

    // Place before `body` to avoid margins
    document.body.before(bannerContainer);
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
