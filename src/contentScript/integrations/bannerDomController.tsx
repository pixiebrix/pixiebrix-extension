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

let bannerContainer: HTMLDivElement | null = null;
let dismissLogin: (configId: UUID) => void = null;

/**
 * Mapping from integration configuration id to deferred login.
 */
const deferredLogins = new Map<UUID, DeferredLogin>();

/*
 * Login requests that have been dismissed by the user. They should not be shown again.
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

/**
 * Show a banner for the given integration configuration. Is a no-op if the banner is already showing.
 */
export function showLoginBanner(
  login: DeferredLogin,
  dismissDeferredLogin: (configId: UUID) => void,
): void {
  dismissLogin ??= (configId: UUID) => {
    dismissedLoginBanners.add(configId);
    dismissDeferredLogin(configId);
  };

  if (!bannerContainer) {
    // Create a new banner container
    bannerContainer = document.createElement("div");

    Object.assign(bannerContainer.style, {
      style: "all: initial",
      position: "relative",
      width: "100%",
      // See https://getbootstrap.com/docs/4.6/layout/overview/#z-index
      // We want the z-index to be high as possible, but lower than the modal
      zIndex: "1030",
    });

    // Insert the banner at the top of the body
    document.body.insertBefore(bannerContainer, document.body.firstChild);
  }

  const { id: configId } = login.config;

  if (dismissedLoginBanners.has(configId)) {
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
  deferredLogins.clear();
  dismissedLoginBanners.clear();
  renderOrUnmountBanners();
}
