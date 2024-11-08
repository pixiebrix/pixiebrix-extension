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

import { type SanitizedIntegrationConfig } from "../../../../integrations/integrationTypes";
import { type FetchableAsyncState } from "../../../../types/sliceTypes";
import useAsyncState from "../../../../hooks/useAsyncState";
import { integrationConfigLocator } from "../../../../background/messenger/api";
import { useContext, useEffect } from "react";
import ModIntegrationsContext from "../../../../mods/ModIntegrationsContext";
import { validateRegistryId } from "../../../../types/helpers";
import reportError from "../../../../telemetry/reportError";
import { oauth2Storage } from "../../../../auth/authConstants";
import { isEmpty } from "lodash";

const GOOGLE_PKCE_INTEGRATION_ID = validateRegistryId("google/oauth2-pkce");

function useGoogleAccountLoginListener({
  data: googleAccount,
  refetch,
}: FetchableAsyncState<SanitizedIntegrationConfig | null>) {
  useEffect(() => {
    const loginController = new AbortController();

    // Automatically refetch the google account on login
    oauth2Storage.onChanged((newValue) => {
      const { id } = googleAccount ?? {};
      // eslint-disable-next-line security/detect-object-injection -- not user provided
      if (id && !isEmpty(newValue[id])) {
        refetch();
      }
    }, loginController.signal);

    return () => {
      loginController.abort();
    };
  }, [googleAccount, refetch]);
}

/**
 * Hook to get the Google account from mod integrations context
 */
function useGoogleAccount(): FetchableAsyncState<SanitizedIntegrationConfig | null> {
  const { integrationDependencies } = useContext(ModIntegrationsContext);

  // Dependency may not exist, do not destructure here
  const googleDependency = integrationDependencies.find(
    ({ integrationId }) => integrationId === GOOGLE_PKCE_INTEGRATION_ID,
  );

  const googleAccountAsyncState = useAsyncState(async () => {
    if (googleDependency?.configId == null) {
      return null;
    }

    try {
      return await integrationConfigLocator.findSanitizedIntegrationConfig(
        googleDependency.integrationId,
        googleDependency.configId,
      );
    } catch (error) {
      reportError(error);
      return null;
    }
  }, [googleDependency]);

  useGoogleAccountLoginListener(googleAccountAsyncState);

  return googleAccountAsyncState;
}

export default useGoogleAccount;
