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

import React from "react";
import { Col, Row } from "react-bootstrap";
import { useAsyncState } from "@/hooks/common";

import { useTitle } from "@/hooks/title";
import DefaultSetupCard from "@/options/pages/onboarding/DefaultSetupCard";
import PartnerSetupCard from "@/options/pages/onboarding/PartnerSetupCard";
import { useRequiredAuth, useRequiredPartnerAuth } from "@/auth/RequireAuth";
import { getInstallURL } from "@/services/baseService";

const SetupPage: React.FunctionComponent = () => {
  useTitle("Setup");
  const {
    hasPartner,
    requiresIntegration,
    hasConfiguredIntegration,
    isLoading: isPartnerLoading,
  } = useRequiredPartnerAuth();
  const { isAccountUnlinked } = useRequiredAuth();

  const [installURL, installURLPending] = useAsyncState(getInstallURL, []);

  if (installURLPending || isPartnerLoading) {
    return null;
  }

  const setupCard = hasPartner ? (
    <PartnerSetupCard
      installURL={installURL}
      isAccountUnlinked={isAccountUnlinked}
      needsConfiguration={
        !requiresIntegration ||
        (requiresIntegration && !hasConfiguredIntegration)
      }
    />
  ) : (
    <DefaultSetupCard installURL={installURL} />
  );

  return (
    <Row className="w-100 mx-0">
      <Col className="mt-5 col-md-10 col-lg-7 col-sm-12 mx-auto">
        {setupCard}
      </Col>
    </Row>
  );
};

export default SetupPage;
