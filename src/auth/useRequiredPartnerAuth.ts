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
import { validateRegistryId } from "@/types/helpers";
import { selectSettings } from "@/store/settingsSelectors";
import { isEmpty } from "lodash";
import { useAsyncState } from "@/hooks/common";
import {
  addListener as addAuthListener,
  readPartnerAuthData,
  removeListener as removeAuthListener,
} from "@/auth/token";
import { useEffect } from "react";

const PARTNER_MAP = new Map<string, Set<RegistryId>>([
  [
    "automation-anywhere",
    new Set([validateRegistryId("automation-anywhere/control-room")]),
  ],
]);

const useRequiredPartnerAuth = () => {
  // Prefer the most recent /api/me/ data from the server
  const { isLoading, data: me, error } = useGetMeQuery();
  const localAuth = useSelector(selectAuth);
  const { authServiceId } = useSelector(selectSettings);
  const configuredServices = useSelector(selectConfiguredServices);

  const { partner, organization } = me ?? localAuth;

  const partnerServiceIds = authServiceId
    ? new Set<RegistryId>([authServiceId])
    : PARTNER_MAP.get(partner?.name) ?? new Set();

  const partnerConfiguration = configuredServices.find((service) =>
    partnerServiceIds.has(service.serviceId)
  );

  const [missingPartnerToken, _tokenLoading, _tokenError, refreshTokenState] =
    useAsyncState(async () => {
      if (isEmpty(authServiceId)) {
        return false;
      }

      const { token: partnerToken } = await readPartnerAuthData();
      return partnerToken == null;
    }, [authServiceId, localAuth]);

  useEffect(() => {
    // Listen for token invalidation
    const handler = async () => {
      console.debug("Auth state changed, checking for token");
      void refreshTokenState();
    };

    addAuthListener(handler);

    return () => {
      removeAuthListener(handler);
    };
  }, [refreshTokenState]);

  const hasPartner = Boolean(partner);
  const requiresIntegration =
    (hasPartner && Boolean(organization?.control_room)) ||
    !isEmpty(authServiceId);

  return {
    hasPartner,
    requiresIntegration,
    hasConfiguredIntegration:
      requiresIntegration &&
      Boolean(partnerConfiguration) &&
      !missingPartnerToken,
    isLoading,
    error,
  };
};

export default useRequiredPartnerAuth;
