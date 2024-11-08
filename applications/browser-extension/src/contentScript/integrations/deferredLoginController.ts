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

import { expectContext } from "../../utils/expectContext";
import { oauth2Storage } from "@/auth/authConstants";
import type { UUID } from "../../types/stringTypes";
import pDefer, { type DeferredPromise } from "p-defer";
import { CancelError, RequestSupersededError } from "@/errors/businessErrors";
import type { SanitizedIntegrationConfig } from "../../integrations/integrationTypes";
import {
  hideAllLoginBanners,
  hideLoginBanner,
  showLoginBanner,
} from "./bannerDomController";
import integrationRegistry from "../../integrations/registry";
import { onContextInvalidated } from "webext-events";
import { isLoadedInIframe } from "../../utils/iframeUtils";
import { showLoginBanner as messengerApiShowLoginBanner } from "../messenger/api";
import { getTopLevelFrame } from "webext-messenger";

/**
 * Deferred login promises by integration configuration id. They're tracked per-frame, but the banner is always
 * shown in the top-level frame.
 */
const deferredLogins = new Map<UUID, DeferredPromise<void>>();

/**
 * Content script messenger handler to show a login banner.
 *
 * @warning Should only be run in the top-level frame.
 */
export async function showBannerFromConfig(
  config: SanitizedIntegrationConfig,
): Promise<void> {
  if (isLoadedInIframe()) {
    console.warn(
      "showBannerFromConfig should only be called in the top-level frame",
    );
  }

  const integration = await integrationRegistry.lookup(config.serviceId);

  showLoginBanner(
    {
      integration,
      config,
    },
    dismissDeferredLogin,
  );
}

/**
 * Defer a login request by showing a login banner and waiting for the user to log in.
 * @param config the integration config to defer login for
 * @throws RequestSupersededError if another login was deferred after this one
 */
export async function deferLogin(
  config: SanitizedIntegrationConfig,
): Promise<void> {
  const deferred = deferredLogins.get(config.id);

  // TODO: the current behavior of one request per frame per configuration is conservative to avoid "thundering herd"
  //  of requests to the same API once the user logs in. We might consider permitting a request buffer vs.
  //  a single deferred request.
  if (deferred) {
    deferred?.reject(new RequestSupersededError());
  }

  const deferredPromise = pDefer<void>();
  deferredLogins.set(config.id, deferredPromise);

  // Safe to call even if we're already in the top-level frame
  const target = await getTopLevelFrame();
  // Await to ensure the banner successfully shows
  await messengerApiShowLoginBanner(target, config);

  return deferredPromise.promise;
}

/** @internal */
export function clearDeferredLogins(): void {
  for (const deferredLogin of deferredLogins.values()) {
    deferredLogin.reject(new CancelError("Context invalidated"));
  }

  deferredLogins.clear();
  hideAllLoginBanners();
}

/** @internal */
export function dismissDeferredLogin(id: UUID): void {
  const deferredLogin = deferredLogins.get(id);
  if (deferredLogin) {
    deferredLogin.reject(new CancelError("User dismissed login"));
  }

  deferredLogins.delete(id);

  hideLoginBanner(id);
}

export function initDeferredLoginController(): void {
  expectContext("contentScript");

  // Watch for auth data updates indicating the user has successfully logged in
  oauth2Storage.onChanged(async () => {
    const authData = await oauth2Storage.get();
    const authenticatedIds = new Set(Object.keys(authData));

    for (const [id, deferredLogin] of deferredLogins.entries()) {
      if (authenticatedIds.has(id)) {
        deferredLogin.resolve();
        hideLoginBanner(id);
        deferredLogins.delete(id);
      }
    }
  });

  // Clean up the UI if the extension context is invalidated
  onContextInvalidated.addListener(() => {
    clearDeferredLogins();
  });
}
