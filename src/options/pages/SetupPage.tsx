/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useCallback } from "react";
import { faCheck, faLink } from "@fortawesome/free-solid-svg-icons";
import { Col, Row, Card, Button, ListGroup } from "react-bootstrap";
import { settingsSlice } from "@/options/slices";
import { useDispatch } from "react-redux";
import { getBaseURL } from "@/services/baseService";
import browser from "webextension-polyfill";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cx from "classnames";
import { useAsyncState } from "@/hooks/common";
import GridLoader from "react-spinners/GridLoader";

import "./SetupPage.scss";
import { useTitle } from "@/hooks/title";
import { LinkButton } from "@/components/LinkButton";

// eslint-disable-next-line prefer-destructuring -- It breaks EnvironmentPlugin
const SERVICE_URL = process.env.SERVICE_URL;
const { setMode } = settingsSlice.actions;

const Step: React.FunctionComponent<{
  number: number;
  completed?: boolean;
  active?: boolean;
}> = ({ number, completed, active, children }) => (
  <ListGroup.Item className={cx("OnboardingStep", { current: active })}>
    <div className="d-flex">
      <div className="OnboardingStep__status">
        {completed && (
          <span>
            <FontAwesomeIcon icon={faCheck} />
          </span>
        )}
      </div>
      <div className="OnboardingStep__step">Step {number}</div>
      <div className="OnboardingStep__content">{children}</div>
    </div>
  </ListGroup.Item>
);

const SetupPage: React.FunctionComponent = () => {
  useTitle("Setup");

  const dispatch = useDispatch();
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

  const setLocal = useCallback(() => {
    dispatch(setMode({ mode: "local" }));
  }, [dispatch]);

  if (accountPending || installURLPending) {
    return (
      <Row className="w-100 mx-0">
        <Col className="mt-5 col-md-10 col-lg-7 col-sm-12 mx-auto">
          <Card className="OnboardingCard">
            <Card.Header>PixieBrix Setup Steps</Card.Header>
            <Card.Body>
              <GridLoader />
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
          <Card.Header>PixieBrix Setup Steps</Card.Header>
          <ListGroup className="list-group-flush">
            <Step number={1} completed>
              Install the PixieBrix browser extension
              <div>
                <span className="text-muted">
                  You have version {browser.runtime.getManifest().version}{" "}
                  installed
                </span>
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

              <div className="mt-2">
                <span className="text-muted">
                  Alternatively, you can use the extension in{" "}
                  <LinkButton onClick={setLocal}>local-only mode</LinkButton>
                </span>
              </div>
            </Step>
          </ListGroup>
        </Card>
      </Col>
    </Row>
  );
};

export default SetupPage;
