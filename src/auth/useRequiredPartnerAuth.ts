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

import { appApi } from "@/services/api";
import { useSelector } from "react-redux";
import { selectAuth } from "@/auth/authSelectors";
import { type RegistryId } from "@/core";
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
import { type AuthState } from "@/auth/authTypes";
import { type SettingsState } from "@/store/settingsTypes";
import { type ManualStorageKey, readStorage } from "@/chrome";

/**
 * Map from partner keys to partner service IDs
 */
const PARTNER_MAP = new Map<string, Set<RegistryId>>([
  [
    AUTOMATION_ANYWHERE_PARTNER_KEY,
    new Set([CONTROL_ROOM_SERVICE_ID, CONTROL_ROOM_OAUTH_SERVICE_ID]),
  ],
]);

type RequiredPartnerState = {
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
  authMethodOverride,
  partnerId,
}: {
  authServiceIdOverride: RegistryId | null;
  authMethodOverride: SettingsState["authMethod"];
  partnerId: AuthState["partner"]["theme"] | null;
}): Set<RegistryId> {
  if (authServiceIdOverride) {
    return new Set<RegistryId>([authServiceIdOverride]);
  }

  if (authMethodOverride === "partner-oauth2") {
    return new Set<RegistryId>([CONTROL_ROOM_OAUTH_SERVICE_ID]);
  }

  if (authMethodOverride === "partner-token") {
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
  const { isLoading, data: me, error } = appApi.endpoints.getMe.useQueryState();
  const localAuth = useSelector(selectAuth);
  const {
    authServiceId: authServiceIdOverride,
    authMethod: authMethodOverride,
    partnerId: partnerIdOverride,
  } = useSelector(selectSettings);
  const configuredServices = useSelector(selectConfiguredServices);

  // Control Room URL specified by IT department during force-install
  const [managedControlRoomUrl] = useAsyncState(
    async () => readStorage(CONTROL_ROOM_URL_MANAGED_KEY, undefined, "managed"),
    []
  );

  // Partner Id/Key specified by IT department during force-install
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
  const isCommunityEditionUser = (me?.milestones ?? []).some(
    ({ key }) => key === "aa_community_edition_register"
  );
  const hasPartner =
    Boolean(partner) ||
    Boolean(managedPartnerId) ||
    hasControlRoom ||
    (Boolean(me?.partner) && isCommunityEditionUser);
  const partnerId =
    partnerIdOverride ??
    managedPartnerId ??
    partner?.theme ??
    (hasControlRoom || isCommunityEditionUser ? "automation-anywhere" : null);

  const partnerServiceIds = decidePartnerServiceIds({
    authServiceIdOverride,
    authMethodOverride,
    partnerId,
  });

  const partnerConfiguration = configuredServices.find((service) =>
    partnerServiceIds.has(service.serviceId)
  );

  // WARNING: the logic in this method must match the logic in usePartnerLoginMode
  // `_` prefix so lint doesn't yell for unused variables in the destructuring
  const [
    isMissingPartnerJwt,
    _partnerJwtLoading,
    _partnerJwtError,
    refreshPartnerJwtState,
  ] = useAsyncState(async () => {
    if (authMethodOverride === "pixiebrix-token") {
      // User forced pixiebrix-token authentication via Advanced Settings > Authentication Method
      return false;
    }

    if (hasControlRoom || authMethodOverride === "partner-oauth2") {
      // Future improvement: check that the Control Room URL from readPartnerAuthData matches the expected
      // Control Room URL
      const { token: partnerToken } = await readPartnerAuthData();
      return partnerToken == null;
    }

    return false;
  }, [authMethodOverride, localAuth, hasControlRoom]);

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
    // Community edition users are required to be linked until they join an organization
    (me?.partner && isCommunityEditionUser) ||
    // User has overridden local settings
    authMethodOverride === "partner-oauth2" ||
    authMethodOverride === "partner-token";

  if (authMethodOverride === "pixiebrix-token") {
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
