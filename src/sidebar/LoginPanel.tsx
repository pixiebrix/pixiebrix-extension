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
import { Button, Col, Container, Row } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSignInAlt } from "@fortawesome/free-solid-svg-icons";
import marketplaceImage from "@img/marketplace.svg";
import useRequiredPartnerAuth from "@/auth/useRequiredPartnerAuth";
import { useSelector } from "react-redux";
import { selectSettings } from "@/store/settingsSelectors";

// eslint-disable-next-line prefer-destructuring -- process.env variable
const SERVICE_URL = process.env.SERVICE_URL;

const DefaultLogin: React.FunctionComponent = () => (
  <Col className="text-center">
    <h4 className="display-6">Connect PixieBrix Account</h4>

    <p>Register/log-in to PixieBrix to access your personal and team bricks</p>

    <Button
      className="mt-4"
      href={SERVICE_URL}
      target="_blank"
      variant="primary"
    >
      <FontAwesomeIcon icon={faSignInAlt} /> Connect Account
    </Button>
  </Col>
);

const PartnerAuth: React.FunctionComponent = () => {
  const extensionUrl = new URL(browser.runtime.getURL("options.html")).href;

  return (
    <Col className="text-center">
      <h4 className="display-6">Connect your AARI account</h4>
      <p>
        Authenticate with Automation Anywhere to continue using your team
        extensions
      </p>
      <Button
        className="mt-4"
        href={extensionUrl}
        target="_blank"
        variant="primary"
      >
        <FontAwesomeIcon icon={faSignInAlt} /> Connect Account
      </Button>
    </Col>
  );
};

const LoginPanel: React.FunctionComponent = () => {
  const { authMethod } = useSelector(selectSettings);
  const { hasPartner, hasConfiguredIntegration } = useRequiredPartnerAuth();

  const showPartnerAuth =
    (hasPartner && !hasConfiguredIntegration) ||
    ["partner-oauth2", "partner-token"].includes(authMethod);

  return (
    <Container>
      <Row className="mt-4">
        {showPartnerAuth ? <PartnerAuth /> : <DefaultLogin />}
      </Row>

      <Row>
        <Col className="text-center">
          <img src={marketplaceImage} alt="Marketplace" width={300} />
        </Col>
      </Row>
    </Container>
  );
};

export default LoginPanel;
