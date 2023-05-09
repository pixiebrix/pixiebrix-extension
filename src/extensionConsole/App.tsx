/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import React, { useEffect } from "react";
import store, { hashHistory, persistor } from "@/store/optionsStore";
import { Provider, useDispatch } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { Container } from "react-bootstrap";
import ErrorBoundary from "@/components/ErrorBoundary";
import ServicesEditor from "@/extensionConsole/pages/services/ServicesEditor";
import BrickCreatePage from "@/extensionConsole/pages/brickEditor/CreatePage";
import BrickEditPage from "@/extensionConsole/pages/brickEditor/EditPage";
import BlueprintsPage from "@/extensionConsole/pages/blueprints/BlueprintsPage";
import SettingsPage from "@/extensionConsole/pages/settings/SettingsPage";
import Navbar from "@/extensionConsole/Navbar";
import Footer from "@/layout/Footer";
import Sidebar from "@/extensionConsole/Sidebar";
import { Route, Switch } from "react-router-dom";
import { ConnectedRouter } from "connected-react-router";
import EnvironmentBanner from "@/layout/EnvironmentBanner";
import ActivateRecipePage from "@/extensionConsole/pages/activateRecipe/ActivateRecipePage";
import ActivateExtensionPage from "@/extensionConsole/pages/activateExtension/ActivateExtensionPage";
import useRefreshRegistries from "@/hooks/useRefreshRegistries";
import SetupPage from "@/extensionConsole/pages/onboarding/SetupPage";
import UpdateBanner from "@/extensionConsole/pages/UpdateBanner";
import registerBuiltinBlocks from "@/blocks/registerBuiltinBlocks";
import registerContribBlocks from "@/contrib/registerContribBlocks";
import registerEditors from "@/contrib/editors";
import DeploymentBanner from "@/extensionConsole/pages/deployments/DeploymentBanner";
import { ModalProvider } from "@/components/ConfirmationModal";
import WorkshopPage from "./pages/workshop/WorkshopPage";
import InvitationBanner from "@/extensionConsole/pages/InvitationBanner";
import BrowserBanner from "./pages/BrowserBanner";
import useFlags from "@/hooks/useFlags";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import RequireAuth from "@/auth/RequireAuth";
import useTheme from "@/hooks/useTheme";
import { logActions } from "@/components/logViewer/logSlice";
import ReduxPersistenceContext, {
  type ReduxPersistenceContextType,
} from "@/store/ReduxPersistenceContext";
import IDBErrorDisplay from "@/extensionConsole/components/IDBErrorDisplay";
import { DeploymentsProvider } from "@/hooks/DeploymentsContext";

// Register the built-in bricks
registerEditors();
registerBuiltinBlocks();
registerContribBlocks();

// Register Widgets
registerDefaultWidgets();

const RefreshBricks: React.VFC = () => {
  const dispatch = useDispatch();
  // Get the latest brick definitions. Defined as a component to put inside the RequireAuth gate in the layout.
  useRefreshRegistries();

  useEffect(() => {
    // Start polling logs
    dispatch(logActions.pollLogs());
  }, [dispatch]);
  return null;
};

const Layout = () => {
  const { logo } = useTheme();
  const { permit } = useFlags();

  return (
    <div>
      <Navbar logo={logo} />
      <Container fluid className="page-body-wrapper">
        {/* It is guaranteed that under RequireAuth the user has a valid API token (either PixieBrix token or partner JWT). */}
        <ErrorBoundary ErrorComponent={IDBErrorDisplay}>
          <RequireAuth LoginPage={SetupPage}>
            <DeploymentsProvider>
              <RefreshBricks />
              <Sidebar />
              <div className="main-panel">
                <BrowserBanner />
                <EnvironmentBanner />
                <UpdateBanner />
                <DeploymentBanner />
                <InvitationBanner />
                <div className="content-wrapper">
                  <ErrorBoundary ErrorComponent={IDBErrorDisplay}>
                    <Switch>
                      <Route
                        exact
                        path="/extensions/install/:extensionId"
                        component={ActivateExtensionPage}
                      />
                      <Route
                        exact
                        path="/:sourcePage/activate/:recipeId"
                        component={ActivateRecipePage}
                      />

                      <Route exact path="/settings" component={SettingsPage} />

                      {permit("services") && (
                        <Route
                          path="/services/:id?"
                          component={ServicesEditor}
                        />
                      )}

                      {/* Switch does not support consolidating Routes using a React fragment */}
                      {permit("workshop") && (
                        <Route
                          exact
                          path="/workshop"
                          component={WorkshopPage}
                        />
                      )}

                      {permit("workshop") && (
                        <Route
                          exact
                          path="/workshop/create/"
                          component={BrickCreatePage}
                        />
                      )}

                      {permit("workshop") && (
                        <Route
                          exact
                          path="/workshop/bricks/:id/"
                          component={BrickEditPage}
                        />
                      )}

                      <Route component={BlueprintsPage} />
                    </Switch>
                  </ErrorBoundary>
                </div>
                <Footer />
              </div>
            </DeploymentsProvider>
          </RequireAuth>
        </ErrorBoundary>
      </Container>
    </div>
  );
};

const authPersistenceContext: ReduxPersistenceContextType = {
  async flush() {
    await persistor.flush();
  },
};

const App: React.FunctionComponent = () => (
  <Provider store={store}>
    <PersistGate persistor={persistor}>
      <ReduxPersistenceContext.Provider value={authPersistenceContext}>
        <ConnectedRouter history={hashHistory}>
          <ModalProvider>
            <Layout />
          </ModalProvider>
        </ConnectedRouter>
      </ReduxPersistenceContext.Provider>
    </PersistGate>
  </Provider>
);

export default App;
