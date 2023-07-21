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

import React from "react";
import { Col, Row } from "react-bootstrap";
import { useTitle } from "@/hooks/title";
import DefaultSetupCard from "@/extensionConsole/pages/onboarding/DefaultSetupCard";
import { getBaseURL } from "@/services/baseService";
import { useSelector } from "react-redux";
import { selectSettings } from "@/store/settingsSelectors";
import Loader from "@/components/Loader";
import useRequiredPartnerAuth from "@/auth/useRequiredPartnerAuth";
import PartnerSetupCard from "@/extensionConsole/pages/onboarding/partner/PartnerSetupCard";
import { useLocation } from "react-router";
import { clearServiceCache } from "@/background/messenger/api";
import notify from "@/utils/notify";
import { syncRemotePackages } from "@/baseRegistry";
import useAsyncState from "@/hooks/useAsyncState";

const Layout: React.FunctionComponent = ({ children }) => (
  <Row className="w-100 mx-0">
    <Col className="mt-5 col-md-10 col-lg-7 col-sm-12 mx-auto">{children}</Col>
  </Row>
);

/**
 * Extension Setup Page, guiding user to link to PixieBrix or connect via partner authentication.
 *
 * See SettingsPage user-controlled settings
 *
 * @see SettingsPage
 */
const SetupPage: React.FunctionComponent = () => {
  useTitle("Setup");
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
  const { data: baseURL, isLoading } = useAsyncState(async () => {
    try {
      await syncRemotePackages();
      // Must happen after the call to fetch service definitions
      await clearServiceCache();
    } catch (error) {
      notify.warning({
        message:
          "Failed to latest load integration definitions. Login via partner may not be available",
        error,
        reportError: true,
      });
    }

    return getBaseURL();
  }, []);

  if (isLoading || isPartnerLoading) {
    return (
      <Layout>
        <Loader />
      </Layout>
    );
  }

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
    setupCard = <PartnerSetupCard />;
  }

  return <Layout>{setupCard}</Layout>;
};

export default SetupPage;
