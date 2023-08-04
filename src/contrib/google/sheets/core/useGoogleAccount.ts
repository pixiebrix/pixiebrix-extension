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

import { type SanitizedIntegrationConfig } from "@/types/integrationTypes";
import { type FetchableAsyncState } from "@/types/sliceTypes";
import useAsyncState from "@/hooks/useAsyncState";
import { services } from "@/background/messenger/api";
import { useContext } from "react";
import ModIntegrationsContext from "@/mods/ModIntegrationsContext";
import { validateRegistryId } from "@/types/helpers";
import reportError from "@/telemetry/reportError";

const GOOGLE_PKCE_INTEGRATION_ID = validateRegistryId("google/oauth2-pkce");

/**
 * Hook to get the Google account from mod integrations context
 */
function useGoogleAccount(): FetchableAsyncState<SanitizedIntegrationConfig | null> {
  const { integrationDependencies } = useContext(ModIntegrationsContext);
  const googleDependency = integrationDependencies.find(
    (dependency) => dependency.id === GOOGLE_PKCE_INTEGRATION_ID
  );

  return useAsyncState(async () => {
    if (googleDependency?.config == null) {
      return null;
    }

    try {
      return await services.locate(
        googleDependency.id,
        googleDependency.config
      );
    } catch (error: unknown) {
      reportError(error);
      return null;
    }
  }, [googleDependency]);
}

export default useGoogleAccount;
