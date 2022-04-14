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

import React, { useEffect } from "react";
import store, { hashHistory, persistor } from "./store";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import Loader from "@/components/Loader";
import { Container } from "react-bootstrap";
import ErrorBoundary from "@/components/ErrorBoundary";
import ServicesEditor from "@/options/pages/services/ServicesEditor";
import BrickCreatePage from "@/options/pages/brickEditor/CreatePage";
import BrickEditPage from "@/options/pages/brickEditor/EditPage";
import BlueprintsPage from "@/options/pages/blueprints/BlueprintsPage";
import SettingsPage from "@/options/pages/settings/SettingsPage";
import Navbar from "@/options/Navbar";
import Footer from "@/layout/Footer";
import Sidebar from "@/options/Sidebar";
import { Route, Switch } from "react-router-dom";
import { ConnectedRouter } from "connected-react-router";
import EnvironmentBanner from "@/layout/EnvironmentBanner";
import ErrorModal from "@/layout/ErrorModal";
import ActivateBlueprintPage from "@/options/pages/marketplace/ActivateBlueprintPage";
import ActivateExtensionPage from "@/options/pages/activateExtension/ActivatePage";
import useRefresh from "@/hooks/useRefresh";
import SetupPage from "@/options/pages/SetupPage";
import { initTelemetry } from "@/background/messenger/api";
import UpdateBanner from "@/options/pages/UpdateBanner";
import registerBuiltinBlocks from "@/blocks/registerBuiltinBlocks";
import registerContribBlocks from "@/contrib/registerContribBlocks";
import registerEditors from "@/contrib/editors";
import DeploymentBanner from "@/options/pages/deployments/DeploymentBanner";
import { ModalProvider } from "@/components/ConfirmationModal";
import WorkshopPage from "./pages/workshop/WorkshopPage";
import InvitationBanner from "@/options/pages/InvitationBanner";
import BrowserBanner from "./pages/BrowserBanner";
import useFlags from "@/hooks/useFlags";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import RequireAuth from "@/auth/RequireAuth";
import { ErrorDisplay } from "@/layout/ErrorDisplay";
import Centered from "@/layout/Centered";

// Register the built-in bricks
registerEditors();
registerBuiltinBlocks();
registerContribBlocks();

// Register Widgets
registerDefaultWidgets();

const RefreshBricks: React.VFC = () => {
  // Get the latest brick definitions. Defined as a component to put inside the RequireAuth gate in the layout.
  useRefresh();
  return null;
};

const ErrorScreen: React.VFC<{ error: unknown }> = ({ error }) => (
  <Centered>
    <ErrorDisplay error={error} />
  </Centered>
);

const Layout = () => {
  const { permit } = useFlags();

  return (
    <div>
      <Navbar />
      <Container fluid className="page-body-wrapper">
        {/* It is guaranteed that under RequireAuth the user has a valid API token. */}
        <RequireAuth LoginPage={SetupPage} ErrorPage={ErrorScreen}>
          <RefreshBricks />
          <Sidebar />
          <div className="main-panel">
            <ErrorModal />
            <BrowserBanner />
            <EnvironmentBanner />
            <UpdateBanner />
            <DeploymentBanner />
            <InvitationBanner />
            <div className="content-wrapper">
              <ErrorBoundary>
                <Switch>
                  <Route
                    exact
                    path="/extensions/install/:extensionId"
                    component={ActivateExtensionPage}
                  />
                  <Route
                    exact
                    path="/:sourcePage/activate/:blueprintId"
                    component={ActivateBlueprintPage}
                  />

                  <Route exact path="/settings" component={SettingsPage} />

                  {permit("services") && (
                    <Route path="/services/:id?" component={ServicesEditor} />
                  )}

                  {/* Switch does not support consolidating Routes using a React fragment */}
                  {permit("workshop") && (
                    <Route exact path="/workshop" component={WorkshopPage} />
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
        </RequireAuth>
      </Container>
    </div>
  );
};

const App: React.FunctionComponent = () => {
  useEffect(() => {
    initTelemetry();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={<Loader />} persistor={persistor}>
        <ConnectedRouter history={hashHistory}>
          <ModalProvider>
            <Layout />
          </ModalProvider>
        </ConnectedRouter>
      </PersistGate>
    </Provider>
  );
};

export default App;
