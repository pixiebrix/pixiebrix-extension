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
import { getBaseURL } from "@/services/baseService";
import { useSelector } from "react-redux";
import { selectSettings } from "@/store/settingsSelectors";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import { isEmpty } from "lodash";
import Loader from "@/components/Loader";
import useRequiredPartnerAuth from "@/auth/useRequiredPartnerAuth";
import PartnerSetupCard from "@/options/pages/onboarding/partner/PartnerSetupCard";

const Layout: React.FunctionComponent = ({ children }) => (
  <Row className="w-100 mx-0">
    <Col className="mt-5 col-md-10 col-lg-7 col-sm-12 mx-auto">{children}</Col>
  </Row>
);

const SetupPage: React.FunctionComponent = () => {
  useTitle("Setup");
  const {
    isLoading: isPartnerLoading,
    hasPartner,
    hasConfiguredIntegration,
  } = useRequiredPartnerAuth();

  const { authServiceId } = useSelector(selectSettings);

  const [baseURL, baseURLPending] = useAsyncState(getBaseURL, []);

  if (baseURLPending || isPartnerLoading) {
    return (
      <Layout>
        <Loader />
      </Layout>
    );
  }

  let setupCard = <DefaultSetupCard installURL={baseURL} />;

  if (
    (!isEmpty(authServiceId) && authServiceId !== PIXIEBRIX_SERVICE_ID) ||
    (hasPartner && !hasConfiguredIntegration)
  ) {
    setupCard = <PartnerSetupCard />;
  }

  return <Layout>{setupCard}</Layout>;
};

export default SetupPage;
