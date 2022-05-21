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

import styles from "./SetupPage.module.scss";

import React from "react";
import { faCheck, faLink } from "@fortawesome/free-solid-svg-icons";
import { Button, Card, Col, ListGroup, Row } from "react-bootstrap";
import { getBaseURL } from "@/services/baseService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cx from "classnames";
import { useAsyncState } from "@/hooks/common";
import Loader from "@/components/Loader";

import { useTitle } from "@/hooks/title";

// eslint-disable-next-line prefer-destructuring -- It breaks EnvironmentPlugin
const SERVICE_URL = process.env.SERVICE_URL;

export const Step: React.FunctionComponent<{
  number: number;
  completed?: boolean;
  active?: boolean;
}> = ({ number, completed, active, children }) => (
  <ListGroup.Item className={cx("p-4", { "font-weight-bold": active })}>
    <div className="d-flex">
      <div className={styles.onboardingStepStatus}>
        {completed && (
          <span>
            <FontAwesomeIcon icon={faCheck} />
          </span>
        )}
      </div>
      <div className={styles.onboardingStepStep}>Step {number}</div>
      <div className={styles.onboardingStepContent}>{children}</div>
    </div>
  </ListGroup.Item>
);

const SetupPage: React.FunctionComponent = () => {
  useTitle("Setup");

  const [accountTab, accountPending] = useAsyncState(async () => {
    const accountTabs = await browser.tabs.query({
      url: new URL("setup", SERVICE_URL).toString(),
    });

    // Close previous tab(s) in the app, if found
    await browser.tabs.remove(accountTabs.map((tab) => tab.id));
    return accountTabs.length > 0;
  }, []);
  const [installURL, installURLPending] = useAsyncState(async () => {
    const url = new URL(await getBaseURL());
    url.searchParams.set("install", "1");
    return url.toString();
  }, []);

  if (accountPending || installURLPending) {
    return (
      <Row className="w-100 mx-0">
        <Col className="mt-5 col-md-10 col-lg-7 col-sm-12 mx-auto">
          <Card className="OnboardingCard">
            <Card.Header className="h4">PixieBrix Setup Steps</Card.Header>
            <Card.Body>
              <Loader />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  }

  // Don't render anything, just visit app
  if (accountTab) {
    location.replace(installURL);
    return null;
  }

  return (
    <Row className="w-100 mx-0">
      <Col className="mt-5 col-md-10 col-lg-7 col-sm-12 mx-auto">
        <Card className="OnboardingCard">
          <Card.Header className="h4">PixieBrix Setup Steps</Card.Header>
          <ListGroup className="list-group-flush">
            <Step number={1} completed>
              Install the PixieBrix browser extension
              <div>
                <small className="text-muted">
                  You have version {browser.runtime.getManifest().version}{" "}
                  installed
                </small>
              </div>
            </Step>
            <Step number={2} active>
              <div>Link the extension to a PixieBrix account</div>
              <div>
                <Button
                  role="button"
                  className="btn btn-primary mt-2"
                  href={installURL}
                >
                  <FontAwesomeIcon icon={faLink} /> Create/link PixieBrix
                  account
                </Button>
              </div>
            </Step>
          </ListGroup>
        </Card>
      </Col>
    </Row>
  );
};

export default SetupPage;
