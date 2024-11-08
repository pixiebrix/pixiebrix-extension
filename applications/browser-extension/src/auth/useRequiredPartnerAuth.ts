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

import { useGetMeQuery } from "../data/service/api";
import { useSelector } from "react-redux";
import { selectAuth } from "./authSelectors";
import { selectIntegrationConfigs } from "../integrations/store/integrationsSelectors";
import { selectSettings } from "../store/settings/settingsSelectors";
import { AUTOMATION_ANYWHERE_PARTNER_KEY } from "../data/service/constants";
import { type SettingsState } from "../store/settings/settingsTypes";
import useManagedStorageState from "../store/enterprise/useManagedStorageState";
import { type RegistryId } from "@/types/registryTypes";
import {
  CONTROL_ROOM_OAUTH_INTEGRATION_ID,
  CONTROL_ROOM_TOKEN_INTEGRATION_ID,
} from "../integrations/constants";
import useLinkState from "./useLinkState";
import usePartnerAuthData from "./usePartnerAuthData";
import { type Nullishable } from "../utils/nullishUtils";
import { type UserPartner } from "../data/model/UserPartner";
import { type ControlRoom } from "../data/model/ControlRoom";
import { Milestones, type UserMilestone } from "../data/model/UserMilestone";
import useAsyncState from "../hooks/useAsyncState";
import { getDeploymentKey } from "./deploymentKey";
import { getExtensionToken } from "./authStorage";

/**
 * Map from partner keys to partner service IDs
 */
const PARTNER_MAP = new Map<string, Set<RegistryId>>([
  [
    AUTOMATION_ANYWHERE_PARTNER_KEY,
    new Set([
      CONTROL_ROOM_TOKEN_INTEGRATION_ID,
      CONTROL_ROOM_OAUTH_INTEGRATION_ID,
    ]),
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
  partnerKey: Nullishable<string>;

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

function decidePartnerIntegrationIds({
  authIntegrationIdOverride,
  authMethodOverride,
  partnerId,
}: {
  authIntegrationIdOverride: RegistryId | null;
  authMethodOverride: SettingsState["authMethod"];
  partnerId: string | null;
}): Set<RegistryId> {
  if (authIntegrationIdOverride) {
    return new Set<RegistryId>([authIntegrationIdOverride]);
  }

  if (authMethodOverride === "partner-oauth2") {
    return new Set<RegistryId>([CONTROL_ROOM_OAUTH_INTEGRATION_ID]);
  }

  if (authMethodOverride === "partner-token") {
    return new Set<RegistryId>([CONTROL_ROOM_TOKEN_INTEGRATION_ID]);
  }

  return PARTNER_MAP.get(partnerId ?? "") ?? new Set();
}

/**
 * Returns true if a required partner JWT is missing
 */
function decideIsMissingPartnerJwt({
  authMethodOverride,
  hasControlRoom,
  managedPartnerId,
  partnerAuthData,
}: {
  authMethodOverride: string | null;
  hasControlRoom: boolean;
  managedPartnerId?: string;
  partnerAuthData: unknown;
}): boolean {
  if (authMethodOverride === "pixiebrix-token") {
    // User forced pixiebrix-token authentication via Advanced Settings > Authentication Method
    return false;
  }

  // Require partner OAuth2 if:
  // - A Control Room URL is configured - on the cached organization or in managed storage
  // - The partner is Automation Anywhere in managed storage. (This is necessary, because the control room URL is
  //   not known at bot agent install time for registry HKLM hive installs)
  // - The user used Advanced Settings > Authentication Method to force partner OAuth2
  if (
    hasControlRoom ||
    managedPartnerId === "automation-anywhere" ||
    authMethodOverride === "partner-oauth2"
  ) {
    return partnerAuthData == null;
  }

  return false;
}

/**
 * Hook for determining if the extension has required integrations for the partner.
 *
 * Covers both:
 * - Integration required, but PixieBrix native token is still used for authentication
 * - Integration required, using partner JWT for authentication
 */
function useRequiredPartnerAuth(): RequiredPartnerState {
  const partnerAuthState = usePartnerAuthData();
  const { data: isLinked, isLoading: isLinkedLoading } = useLinkState();

  const {
    isLoading: isMeLoading,
    data: me,
    error: meError,
  } = useGetMeQuery(undefined, {
    refetchOnMountOrArgChange: true,
    // Skip because useGetMeQuery throws an error if the user is not linked
    skip: !isLinked,
  });

  const {
    data: isAuthenticatedWithPixiebrixToken,
    isLoading: isGetPixiebrixTokenLoading,
  } = useAsyncState(async () => {
    const token = await getExtensionToken();
    return Boolean(token);
  }, []);

  const { data: deploymentKey, isLoading: isDeploymentKeyLoading } =
    useAsyncState(async () => getDeploymentKey(), []);

  const localAuth = useSelector(selectAuth);
  const {
    authIntegrationId: authIntegrationIdOverride,
    authMethod: authMethodOverride,
    partnerId: partnerIdOverride,
  } = useSelector(selectSettings);
  const integrationConfigs = useSelector(selectIntegrationConfigs);

  // Read enterprise managed state
  const { data: managedState } = useManagedStorageState();
  const { controlRoomUrl: managedControlRoomUrl, partnerId: managedPartnerId } =
    managedState ?? {};

  // Prefer the latest remote data, but use local data to avoid blocking page load
  let partner: Nullishable<UserPartner> = null;
  let controlRoom: Nullishable<ControlRoom> = null;
  const userMilestones: UserMilestone[] = [];

  if (me) {
    const organization = me.primaryTeam ?? null;
    partner = me.partner;
    controlRoom = organization?.controlRoom ?? null;
    userMilestones.push(...me.userMilestones);
  } else if (localAuth) {
    partner = localAuth.partner;
    controlRoom = localAuth.organization?.control_room ?? null;
    userMilestones.push(...localAuth.milestones);
  }

  // `organization?.control_room?.id` can only be set when authenticated or the auth is cached
  const hasControlRoom = controlRoom != null || Boolean(managedControlRoomUrl);
  const isCommunityEditionUser = userMilestones.some(
    ({ milestoneName }) =>
      milestoneName === Milestones.AA_COMMUNITY_EDITION_REGISTER,
  );

  const hasPartner =
    Boolean(partner) ||
    Boolean(managedPartnerId) ||
    hasControlRoom ||
    (Boolean(me?.partner) && isCommunityEditionUser);

  if (authMethodOverride === "pixiebrix-token" || deploymentKey) {
    // User forced pixiebrix-token authentication via Advanced Settings > Authentication Method or deployment key is set
    // Keep the theme, if any, but don't require a partner integration configuration.
    return {
      hasPartner,
      partnerKey: partner?.partnerTheme,
      requiresIntegration: false,
      hasConfiguredIntegration: false,
      isLoading: false,
      error: undefined,
    };
  }

  const partnerId =
    partnerIdOverride ??
    managedPartnerId ??
    partner?.partnerTheme ??
    (hasControlRoom || isCommunityEditionUser ? "automation-anywhere" : null);

  const partnerIntegrationIds = decidePartnerIntegrationIds({
    authIntegrationIdOverride,
    authMethodOverride,
    partnerId,
  });

  const isMissingPartnerJwt = decideIsMissingPartnerJwt({
    authMethodOverride,
    hasControlRoom,
    managedPartnerId,
    partnerAuthData: partnerAuthState.data,
  });

  const partnerConfiguration = integrationConfigs.find((integrationConfig) =>
    partnerIntegrationIds.has(integrationConfig.integrationId),
  );

  const requiresIntegration =
    [null, undefined, "default"].includes(authMethodOverride) &&
    isAuthenticatedWithPixiebrixToken
      ? false
      : // Primary organization has a partner and linked control room
        (hasPartner && controlRoom != null) ||
        // Partner Automation Anywhere is configured in managed storage (e.g., set by Bot Agent installer)
        managedPartnerId === "automation-anywhere" ||
        // Community edition users are required to be linked until they join an organization
        (me?.partner && isCommunityEditionUser) ||
        // User has overridden local settings
        authMethodOverride === "partner-oauth2" ||
        authMethodOverride === "partner-token";

  return {
    hasPartner,
    partnerKey: partner?.partnerTheme ?? managedPartnerId,
    requiresIntegration,
    hasConfiguredIntegration:
      requiresIntegration &&
      Boolean(partnerConfiguration) &&
      !isMissingPartnerJwt,
    isLoading:
      isMeLoading ||
      isLinkedLoading ||
      isDeploymentKeyLoading ||
      isGetPixiebrixTokenLoading,
    error: meError,
  };
}

export default useRequiredPartnerAuth;
