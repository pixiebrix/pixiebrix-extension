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

import { useGetMeQuery } from "@/services/api";
import { useSelector } from "react-redux";
import { selectAuth } from "@/auth/authSelectors";
import { RegistryId } from "@/core";
import { selectConfiguredServices } from "@/store/servicesSelectors";
import { selectSettings } from "@/store/settingsSelectors";
import { useAsyncState } from "@/hooks/common";
import {
  addListener as addAuthListener,
  readPartnerAuthData,
  removeListener as removeAuthListener,
} from "@/auth/token";
import { useEffect } from "react";
import {
  AUTOMATION_ANYWHERE_PARTNER_KEY,
  CONTROL_ROOM_OAUTH_SERVICE_ID,
  CONTROL_ROOM_SERVICE_ID,
} from "@/services/constants";
import { AuthState } from "@/auth/authTypes";
import { SettingsState } from "@/store/settingsTypes";
import { ManualStorageKey, readStorage } from "@/chrome";

/**
 * Map from partner keys to partner service IDs
 */
const PARTNER_MAP = new Map<string, Set<RegistryId>>([
  [
    AUTOMATION_ANYWHERE_PARTNER_KEY,
    new Set([CONTROL_ROOM_SERVICE_ID, CONTROL_ROOM_OAUTH_SERVICE_ID]),
  ],
]);

export type RequiredPartnerState = {
  /**
   * True if the user's is a partner account.
   */
  hasPartner: boolean;

  /**
   * The partner key of the partner, or null if hasPartner is false.
   *
   * @see RequiredPartnerState.hasPartner
   */
  partnerKey: string | null;

  /**
   * True if the user's account is a partner account and must have an integration configured for the partner.
   *
   * @see RequiredPartnerState.hasPartner
   */
  requiresIntegration: boolean;

  /**
   * True if the user's account requires a partner integration configuration, that the user has a configuration
   * for the integration, and that the user has a bearer token for the integration.
   */
  hasConfiguredIntegration: boolean;

  /**
   * True if latest partner information is loading from the PixieBrix server.
   */
  isLoading: boolean;

  /**
   * The error if there was an error loading partner information from the PixieBrix server, or null otherwise.
   */
  error: unknown;
};

function decidePartnerServiceIds({
  authServiceIdOverride,
  authMethod,
  partnerId,
}: {
  authServiceIdOverride: RegistryId | null;
  authMethod: SettingsState["authMethod"];
  partnerId: AuthState["partner"]["theme"] | null;
}): Set<RegistryId> {
  if (authServiceIdOverride) {
    return new Set<RegistryId>([authServiceIdOverride]);
  }

  if (authMethod === "partner-oauth2") {
    return new Set<RegistryId>([CONTROL_ROOM_OAUTH_SERVICE_ID]);
  }

  if (authMethod === "partner-token") {
    return new Set<RegistryId>([CONTROL_ROOM_SERVICE_ID]);
  }

  return PARTNER_MAP.get(partnerId) ?? new Set();
}

const CONTROL_ROOM_URL_MANAGED_KEY = "controlRoomUrl" as ManualStorageKey;
const PARTNER_MANAGED_KEY = "partnerId" as ManualStorageKey;

/**
 * Hook for determining if the extension has required integrations for the partner.
 *
 * Covers both:
 * - Integration required, but PixieBrix native token is still used for authentication
 * - Integration required, using partner JWT for authentication
 */
function useRequiredPartnerAuth(): RequiredPartnerState {
  // Prefer the most recent /api/me/ data from the server
  const { isLoading, data: me, error } = useGetMeQuery();
  const localAuth = useSelector(selectAuth);
  const { authServiceId: authServiceIdOverride, authMethod } =
    useSelector(selectSettings);
  const configuredServices = useSelector(selectConfiguredServices);

  const [managedControlRoomUrl] = useAsyncState(
    async () => readStorage(CONTROL_ROOM_URL_MANAGED_KEY, undefined, "managed"),
    []
  );

  const [managedPartnerId] = useAsyncState(
    async () => readStorage(PARTNER_MANAGED_KEY, undefined, "managed"),
    []
  );

  // Prefer the latest remote data, but use local data to avoid blocking page load
  const { partner, organization } = me ?? localAuth;
  // `organization?.control_room?.id` can only be set when authenticated or the auth is cached. For unauthorized users,
  // the organization will be null on result of useGetMeQuery
  const hasControlRoom =
    Boolean(organization?.control_room?.id) || Boolean(managedControlRoomUrl);
  const hasPartner = Boolean(partner) || Boolean(managedPartnerId);

  const partnerServiceIds = decidePartnerServiceIds({
    authServiceIdOverride,
    authMethod,
    partnerId: managedPartnerId ?? partner?.theme,
  });

  const partnerConfiguration = configuredServices.find((service) =>
    partnerServiceIds.has(service.serviceId)
  );

  // `_` prefix so lint doesn't yell for unused variables in the destructuring
  const [
    isMissingPartnerJwt,
    _partnerJwtLoading,
    _partnerJwtError,
    refreshPartnerJwtState,
  ] = useAsyncState(async () => {
    if (authMethod === "pixiebrix-token") {
      // User forced pixiebrix-token authentication via Advanced Settings > Authentication Method
      return false;
    }

    if (hasControlRoom || authMethod === "partner-oauth2") {
      // Future improvement: check that the Control Room URL from readPartnerAuthData matches the expected
      // Control Room URL
      const { token: partnerToken } = await readPartnerAuthData();
      return partnerToken == null;
    }

    return false;
  }, [authMethod, localAuth, hasControlRoom]);

  useEffect(() => {
    // Listen for token invalidation
    const handler = async () => {
      console.debug("Auth state changed, checking for token");
      void refreshPartnerJwtState();
    };

    addAuthListener(handler);

    return () => {
      removeAuthListener(handler);
    };
  }, [refreshPartnerJwtState]);

  const requiresIntegration =
    // Primary organization has a partner and linked control room
    (hasPartner && Boolean(organization?.control_room)) ||
    // User has overridden local settings
    authMethod === "partner-oauth2" ||
    authMethod === "partner-token";

  if (authMethod === "pixiebrix-token") {
    // User forced pixiebrix-token authentication via Advanced Settings > Authentication Method. Keep the theme,
    // if any, but don't require a partner integration configuration.
    return {
      hasPartner,
      partnerKey: partner?.theme,
      requiresIntegration: false,
      hasConfiguredIntegration: false,
      isLoading: false,
      error: undefined,
    };
  }

  return {
    hasPartner,
    partnerKey: partner?.theme,
    requiresIntegration,
    hasConfiguredIntegration:
      requiresIntegration &&
      Boolean(partnerConfiguration) &&
      !isMissingPartnerJwt,
    isLoading,
    error,
  };
}

export default useRequiredPartnerAuth;
