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
import { Button, Container } from "react-bootstrap";
import { HashRouter as Router } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import { DevToolsContext, useDevConnection } from "@/devTools/context";
import GridLoader from "react-spinners/GridLoader";
import Editor from "@/devTools/Editor";
import store, { persistor } from "./store";
import { PersistGate } from "redux-persist/integration/react";
import { Provider } from "react-redux";
import { useAuth } from "@/hooks/auth";
import AuthContext from "@/auth/AuthContext";
import { ToastProvider } from "react-toast-notifications";
import { useAsyncEffect } from "use-async-effect";
import blockRegistry from "@/blocks/registry";
import Centered from "@/devTools/editor/components/Centered";
import { ModalProvider } from "@/components/ConfirmationModal";
import registerBuiltinBlocks from "@/blocks/registerBuiltinBlocks";
import registerContribBlocks from "@/contrib/registerContribBlocks";
import { getErrorMessage } from "@/errors";
import browser from "webextension-polyfill";

// Import custom options widgets/forms for the built-in bricks
import "@/contrib/editors";
import { RequireScope } from "@/auth/RequireScope";

registerContribBlocks();
registerBuiltinBlocks();

const PersistLoader: React.FunctionComponent = () => (
  <Centered>
    <div className="d-flex justify-content-center">
      <GridLoader />
    </div>
  </Centered>
);

const ErrorBanner: React.FunctionComponent<{ error?: string }> = ({ error }) =>
  error ? (
    <div className="d-flex p-1 align-items-center alert-danger flex-align-center">
      <div className="flex-grow-1">{error}</div>
      <div>
        <Button
          className="mr-2"
          size="sm"
          variant="light"
          onClick={() => {
            void browser.tabs.reload(browser.devtools.inspectedWindow.tabId);
          }}
        >
          Reload Page
        </Button>
        <Button
          size="sm"
          variant="light"
          onClick={() => {
            location.reload();
          }}
        >
          Reload Editor
        </Button>
      </div>
    </div>
  ) : null;

const Panel: React.FunctionComponent = () => {
  const authState = useAuth();
  const context = useDevConnection();

  useAsyncEffect(async () => {
    await blockRegistry.fetch();
  }, []);

  const error = authState.error
    ? "Authentication error: " + getErrorMessage(authState.error)
    : context.tabState.error;

  return (
    <Provider store={store}>
      <PersistGate loading={<PersistLoader />} persistor={persistor}>
        <AuthContext.Provider value={authState}>
          <DevToolsContext.Provider value={context}>
            <ToastProvider>
              <ModalProvider>
                <ErrorBoundary>
                  <Router>
                    <Container fluid className="DevToolsContainer">
                      <ErrorBanner error={error} />
                      <RequireScope
                        scope={authState?.scope}
                        isPending={authState.isPending}
                        scopeSettingsTitle="Welcome to the PixieBrix Page Editor!"
                        scopeSettingsDescription="To create extensions, you must first set an account alias for your PixieBrix account"
                      >
                        <Editor />
                      </RequireScope>
                    </Container>
                  </Router>
                </ErrorBoundary>
              </ModalProvider>
            </ToastProvider>
          </DevToolsContext.Provider>
        </AuthContext.Provider>
      </PersistGate>
    </Provider>
  );
};

export default Panel;
