/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useCallback } from "react";
import { faCheck, faLink } from "@fortawesome/free-solid-svg-icons";
import { Col, Row, Card, Button, ListGroup } from "react-bootstrap";
import { settingsSlice } from "@/options/slices";
import { useDispatch } from "react-redux";
import { getBaseURL } from "@/services/baseService";
import { browser } from "webextension-polyfill-ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cx from "classnames";
import { useAsyncState } from "@/hooks/common";
import { hasAppAccount } from "@/background/installer";
import GridLoader from "react-spinners/GridLoader";

import "./SetupPage.scss";
import { reportError } from "@/telemetry/logging";
import { useTitle } from "@/hooks/title";

const { setMode } = settingsSlice.actions;

const Step: React.FunctionComponent<{
  number: number;
  completed?: boolean;
  active?: boolean;
}> = ({ number, completed, active, children }) => {
  return (
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
};

const SetupPage: React.FunctionComponent = () => {
  useTitle("Setup");

  const dispatch = useDispatch();
  const [accountTab, accountPending] = useAsyncState(() => hasAppAccount(), []);

  const setLocal = useCallback(() => {
    dispatch(setMode({ mode: "local" }));
  }, [dispatch]);

  const connectApp = useCallback(async () => {
    const url = new URL(await getBaseURL());
    url.searchParams.set("install", "1");

    if (accountTab) {
      // Try to do everything in the setup tab
      await browser.tabs.update(accountTab.id, {
        url: url.toString(),
        active: true,
      });
    } else {
      await browser.tabs.create({
        url: url.toString(),
        active: true,
      });
    }
    // Close the browser extension tab
    window.close();
  }, [accountTab]);

  // try to automatically open the web app to sync the credentials so that the user doesn't
  // have to click the button
  useAsyncState(async () => {
    if (accountTab) {
      connectApp().catch((error) => {
        reportError(error);
        console.error(
          "Error automatically opening application tab to link account",
          {
            error,
          }
        );
      });
    }
  }, [connectApp, accountTab]);

  if (accountPending) {
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

  return (
    <Row className="w-100 mx-0">
      <Col className="mt-5 col-md-10 col-lg-7 col-sm-12 mx-auto">
        <Card className="OnboardingCard">
          <Card.Header>PixieBrix Setup Steps</Card.Header>
          <ListGroup className="list-group-flush">
            {accountTab && (
              <Step number={1} completed>
                Create an account
              </Step>
            )}

            <Step number={accountTab ? 2 : 1} completed>
              Install the PixieBrix browser extension
              <div>
                <span className="text-muted">
                  You have version {browser.runtime.getManifest().version}{" "}
                  installed
                </span>
              </div>
            </Step>

            {accountTab ? (
              <Step number={3} active>
                <div>Link the extension to your account</div>
                <div>
                  <Button
                    role="button"
                    className="btn btn-primary mt-2"
                    onClick={connectApp}
                  >
                    <FontAwesomeIcon icon={faLink} /> Link PixieBrix account
                  </Button>
                </div>
              </Step>
            ) : (
              <Step number={2} active>
                <div>Link the extension to a PixieBrix account</div>
                <div>
                  <Button
                    role="button"
                    className="btn btn-primary mt-2"
                    onClick={connectApp}
                  >
                    <FontAwesomeIcon icon={faLink} /> Create/link PixieBrix
                    account
                  </Button>
                </div>

                <div className="mt-2">
                  <span className="text-muted">
                    Alternatively, you can use the extension in{" "}
                    <a href="#" onClick={setLocal}>
                      local-only mode
                    </a>
                  </span>
                </div>
              </Step>
            )}
          </ListGroup>
        </Card>
      </Col>
    </Row>
  );
};

export default SetupPage;
