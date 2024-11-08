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

import React from "react";
import useSetDocumentTitle from "@/hooks/useSetDocumentTitle";
import DefaultSetupCard from "./DefaultSetupCard";
import { getBaseURL } from "@/data/service/baseService";
import { useSelector } from "react-redux";
import { selectSettings } from "../../../store/settings/settingsSelectors";
import Loader from "@/components/Loader";
import useRequiredPartnerAuth from "@/auth/useRequiredPartnerAuth";
import PartnerSetupCard from "./partner/PartnerSetupCard";
import { useLocation } from "react-router";
import { clearIntegrationRegistry } from "@/background/messenger/api";
import notify from "../../../utils/notify";
import { syncRemotePackages } from "../../../registry/memoryRegistry";
import useAsyncState from "@/hooks/useAsyncState";
import {
  CONTROL_ROOM_OAUTH_INTEGRATION_ID,
  CONTROL_ROOM_TOKEN_INTEGRATION_ID,
} from "../../../integrations/constants";
import integrationRegistry from "../../../integrations/registry";
import reportError from "../../../telemetry/reportError";
import useReportError from "@/hooks/useReportError";
import { assertNotNullish } from "../../../utils/nullishUtils";
import { type EmptyObject } from "type-fest";

const Layout: React.FunctionComponent<React.PropsWithChildren<EmptyObject>> = ({
  children,
}) => <div className="mt-5 w-100 max-550 mx-auto">{children}</div>;

/**
 * Extension Setup Page, guiding user to link to PixieBrix or connect via partner authentication.
 *
 * See SettingsPage user-controlled settings
 *
 * @see SettingsPage
 */
const SetupPage: React.FunctionComponent = () => {
  useSetDocumentTitle("Setup");
  // Must use useLocation because we're checking the path in the hash route.
  const location = useLocation();
  const isStartUrl = location.pathname.startsWith("/start");

  // Local override for authentication method
  const { authMethod } = useSelector(selectSettings);

  const {
    isLoading: isPartnerLoading,
    hasPartner,
    hasConfiguredIntegration,
  } = useRequiredPartnerAuth();

  // Fetch service definitions which are required for partner JWT login in parallel with useRequiredPartnerAuth
  // useAsyncState with ignored output to track loading state
  const { data, isLoading, error } = useAsyncState(async () => {
    let controlRoomError: undefined | unknown;
    try {
      await syncRemotePackages();
      // Must happen after the call to fetch service definitions
      await clearIntegrationRegistry();
    } catch (error) {
      reportError(error);
      // If an error was thrown, check if the control room integration definitions are available to determine if we should
      // show an error toast in the partner setup card case.
      try {
        const controlRoomTokenIntegrationPromise = integrationRegistry.lookup(
          CONTROL_ROOM_TOKEN_INTEGRATION_ID,
        );
        const controlRoomOauthIntegrationPromise = integrationRegistry.lookup(
          CONTROL_ROOM_OAUTH_INTEGRATION_ID,
        );
        await Promise.all([
          controlRoomTokenIntegrationPromise,
          controlRoomOauthIntegrationPromise,
        ]);
      } catch {
        controlRoomError = error;
      }
    }

    return { baseURL: await getBaseURL(), controlRoomError };
  }, []);

  useReportError(error);

  if (isLoading || isPartnerLoading) {
    return <Loader />;
  }

  assertNotNullish(data, "baseUrl should be defined after loading");

  const { baseURL, controlRoomError } = data;

  let setupCard = <DefaultSetupCard installURL={baseURL} />;

  if (authMethod === "pixiebrix-token") {
    // User has overridden settings to use PixieBrix token even though they might be connected to an organization
    // that has a linked Control Room
    setupCard = <DefaultSetupCard installURL={baseURL} />;
  } else if (
    isStartUrl ||
    (hasPartner && !hasConfiguredIntegration) ||
    // The user has overridden to use the partner auth even though they might be linked via PixieBrix token
    authMethod === "partner-token" ||
    authMethod === "partner-oauth2"
  ) {
    if (controlRoomError) {
      notify.warning({
        message:
          "Error retrieving partner integration definition. Reload the page. If the problem persists, restart your browser",
      });
    }

    setupCard = <PartnerSetupCard />;
  }

  return <Layout>{setupCard}</Layout>;
};

export default SetupPage;
