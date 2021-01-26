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
import { DevToolsContext, useDevConnection } from "@/devTools/context";
import { GridLoader } from "react-spinners";
import Editor from "@/devTools/Editor";
import { browser } from "webextension-polyfill-ts";
import { getTabInfo } from "@/background/devtools";
import store, { persistor, RootState } from "./store";
import { PersistGate } from "redux-persist/integration/react";
import { Provider, useSelector } from "react-redux";
import { useAsyncState } from "@/hooks/common";
import { getAuth } from "@/hooks/auth";
import { AuthContext } from "@/auth/context";
import { ToastProvider } from "react-toast-notifications";
import useAsyncEffect from "use-async-effect";
import blockRegistry from "@/blocks/registry";

// Import bricks for the registry
import "@/blocks/effects";
import "@/blocks/readers";
import "@/blocks/transformers";
import "@/blocks/renderers";
import "@/contrib/index";
import { sleep } from "@/utils";
import ScopeSettings from "@/devTools/ScopeSettings";
import { AuthState } from "@/core";

const defaultState: AuthState = {
  isLoggedIn: false,
  extension: true,
  isOnboarded: undefined,
  flags: [],
};

const Centered: React.FunctionComponent = ({ children }) => {
  return (
    <Container fluid>
      <Row>
        <Col className="mx-auto mt-4 text-center" md={8} lg={5} sm={11}>
          {children}
        </Col>
      </Row>
    </Container>
  );
};

const PersistLoader: React.FunctionComponent = () => {
  return (
    <Centered>
      <div className="d-flex justify-content-center">
        <GridLoader />
      </div>
    </Centered>
  );
};

const RequireScope: React.FunctionComponent<{ scope: string | null }> = ({
  scope,
  children,
}) => {
  const mode = useSelector<RootState, string>(({ settings }) => settings.mode);

  if (mode !== "local" && (scope === "" || !scope)) {
    return <ScopeSettings />;
  } else {
    return <>{children}</>;
  }
};

const Panel: React.FunctionComponent = () => {
  const [authState, , authError] = useAsyncState(getAuth);
  const [context, connect] = useDevConnection();

  useAsyncEffect(async () => {
    await blockRegistry.fetch();
  }, []);

  const requestPermissions = useCallback(async () => {
    // FIXME: will this work on Firefox? Might need to do as then() b/c it gets confused by await before
    //   the permissions request.
    const { url } = await getTabInfo(context.port);
    if (await browser.permissions.request({ origins: [url] })) {
      await sleep(500);
      location.reload();
    }
  }, [connect, context.port]);

  if (authError) {
    return (
      <Centered>
        <div className="mb-2">
          <b>Error authenticating account</b>
        </div>
        <div>{authError.toString()}</div>
        <Button onClick={() => location.reload()}>Reload Editor</Button>
      </Centered>
    );
  } else if (context.error) {
    return (
      <Centered>
        <div className="mb-2">
          <b>An error occurred</b>
        </div>
        <div>{authError.toString()}</div>
        <Button onClick={() => location.reload()}>Reload Editor</Button>
      </Centered>
    );
  } else if (context.error) {
    return (
      <Centered>
        <div className="mb-2">
          <b>An error occurred</b>
        </div>
        <div>{authError.toString()}</div>
        <Button onClick={() => location.reload()}>Reload Editor</Button>
      </Centered>
    );
  } else if (!context.port) {
    return (
      <Centered>
        <p>Initializing connection...</p>
        <div className="d-flex justify-content-center">
          <GridLoader />
        </div>
      </Centered>
    );
  } else if (context.hasTabPermissions === false) {
    return (
      <Centered>
        <div className="mb-2">
          <b>PixieBrix does not have access to the page</b>
        </div>
        <div className="mb-2 text-left">
          <p>
            Grant permanent access to this domain by clicking the button below.
          </p>

          <p>
            Or, grant temporary access by 1) clicking on the PixieBrix extension
            in the extensions dropdown, and 2) then refreshing the page.
          </p>
        </div>
        <Button onClick={requestPermissions}>Grant Permanent Access</Button>
      </Centered>
    );
  }

  return (
    <Provider store={store}>
      <PersistGate loading={PersistLoader} persistor={persistor}>
        <AuthContext.Provider value={authState ?? defaultState}>
          <DevToolsContext.Provider value={context}>
            <ToastProvider>
              <ErrorBoundary>
                <Router>
                  <Container fluid className="DevToolsContainer">
                    <RequireScope scope={authState?.scope}>
                      <Editor />
                    </RequireScope>
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
