/*
 * Copyright (C) 2020 Pixie Brix, LLC
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
import { PageTitle } from "@/layout/Page";
import { faStar } from "@fortawesome/free-solid-svg-icons";
import { Col, Row, Card, Button } from "react-bootstrap";

import { settingsSlice } from "@/options/slices";
import { useDispatch } from "react-redux";
import { getBaseURL } from "@/services/baseService";

const { setMode } = settingsSlice.actions;

const SetupPage: React.FunctionComponent = () => {
  const dispatch = useDispatch();

  const setLocal = useCallback(() => {
    dispatch(setMode({ mode: "local" }));
  }, [dispatch]);

  const connectApp = useCallback(async () => {
    const url = new URL(await getBaseURL());
    url.searchParams.set("install", "1");

    await browser.tabs.create({
      url: url.toString(),
      active: true,
    });

    window.close();
  }, []);

  return (
    <div>
      <PageTitle icon={faStar} title="Welcome!" />
      <div className="pb-4">
        <p>
          Connect a PixieBrix account to collaborate with your teams and the
          PixieBrix community
        </p>
      </div>
      <Row>
        <Col xl={8} lg={10} md={12}>
          <Card>
            <Card.Header>Connect PixieBrix Account</Card.Header>
            <Card.Body>
              <p>
                PixieBrix is more fun with friends! Connect a PixieBrix account
                to collaborate with your teams and publish bricks.
              </p>
              <p>
                Click Connect Account to open the PixieBrix webapp. When you
                register/login, your account will be automatically linked to
                your browser.
              </p>
            </Card.Body>
            <Card.Footer>
              <Button variant="link" onClick={setLocal}>
                Use Local-only Mode
              </Button>
              <Button variant="primary" onClick={connectApp}>
                Connect Account
              </Button>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SetupPage;
