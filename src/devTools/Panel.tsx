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

import "regenerator-runtime/runtime";
import "core-js/stable";
import React, { useCallback } from "react";
import { Button, Col, Container, Row } from "react-bootstrap";
import { HashRouter as Router } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import { DevToolsContext, useMakeContext } from "@/devTools/context";
import { GridLoader } from "react-spinners";
import Editor from "@/devTools/Editor";
import { browser } from "webextension-polyfill-ts";
import { getTabInfo } from "@/background/devtools";
import optionsStore, { persistor } from "@/options/store";
import { PersistGate } from "redux-persist/integration/react";
import { Provider } from "react-redux";
import { useAsyncState } from "@/hooks/common";
import { getAuth } from "@/hooks/auth";
import { AuthContext } from "@/auth/context";
import { ToastProvider } from "react-toast-notifications";
import useAsyncEffect from "use-async-effect";
import blockRegistry from "@/blocks/registry";

// Import bricks for the registry
import "@/blocks/effects";
import "@/blocks/readers";
import "@/blocks/renderers";
import "@/contrib/index";

// CSS
import "vendors/theme/app/app.scss";
import "vendors/overrides.scss";
import "./Panel.scss";

const defaultState = { isLoggedIn: false, extension: true };

const Centered: React.FunctionComponent = ({ children }) => {
  return (
    <Container fluid>
      <Row>
        <Col className="mx-auto mt-4 text-center" md={4} sm={10}>
          {children}
        </Col>
      </Row>
    </Container>
  );
};

const Panel: React.FunctionComponent = () => {
  const [authState, , authError] = useAsyncState(getAuth);
  const [context, connect] = useMakeContext();

  useAsyncEffect(async () => {
    await blockRegistry.fetch();
  }, []);

  const request = useCallback(async () => {
    // FIXME: will this work on Firefox? Might need to do as then() b/c it gets confused by await before
    //   the permissions request.
    const { url } = await getTabInfo(context.port);
    if (await browser.permissions.request({ origins: [url] })) {
      location.reload();
    }
  }, [connect, context.port]);

  if (authError) {
    return (
      <Centered>
        <div>Error authenticating account: {authError.toString()}</div>;
      </Centered>
    );
  } else if (context.error) {
    return (
      <Centered>
        <div>An error occurred: {context.error.toString()}</div>;
      </Centered>
    );
  } else if (!context.port) {
    return (
      <Centered>
        <GridLoader />
      </Centered>
    );
  } else if (!context.hasTabPermissions) {
    return (
      <Centered>
        <p>PixieBrix does not have access to the page.</p>
        <Button onClick={request}>Grant Permanent Access</Button>
      </Centered>
    );
  }

  return (
    <Provider store={optionsStore}>
      <PersistGate loading={<GridLoader />} persistor={persistor}>
        <AuthContext.Provider value={authState ?? defaultState}>
          <DevToolsContext.Provider value={context}>
            <ToastProvider>
              <ErrorBoundary>
                <Router>
                  <Container fluid className="DevToolsContainer">
                    <Editor />
                  </Container>
                </Router>
              </ErrorBoundary>
            </ToastProvider>
          </DevToolsContext.Provider>
        </AuthContext.Provider>
      </PersistGate>
    </Provider>
  );
};

export default Panel;
