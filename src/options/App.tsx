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
import { Provider, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import GridLoader from "react-spinners/GridLoader";
import { Container } from "react-bootstrap";
import ErrorBoundary from "@/components/ErrorBoundary";
import InstalledPage from "@/options/pages/installed/InstalledPage";
import ServicesEditor from "@/options/pages/services/ServicesEditor";
import BrickCreatePage from "@/options/pages/brickEditor/CreatePage";
import BrickEditPage from "@/options/pages/brickEditor/EditPage";
import MarketplacePage from "@/options/pages/MarketplacePage";
import BlueprintsPage from "@/options/pages/blueprints/BlueprintsPage";
import SettingsPage from "@/options/pages/settings/SettingsPage";
import Navbar from "@/layout/Navbar";
import Footer from "@/layout/Footer";
import Sidebar from "@/layout/Sidebar";
import { Route, Switch } from "react-router-dom";
import { ConnectedRouter } from "connected-react-router";
import { ToastProvider } from "react-toast-notifications";
import { useGetAuthQuery } from "@/services/api";
import { useAsyncState } from "@/hooks/common";
import EnvironmentBanner from "@/layout/EnvironmentBanner";
import ErrorModal from "@/layout/ErrorModal";
import ActivateBlueprintPage from "@/options/pages/marketplace/ActivateBlueprintPage";
import ActivateExtensionPage from "@/options/pages/activateExtension/ActivatePage";
import useRefresh from "@/hooks/useRefresh";
import { isLinked } from "@/auth/token";
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
import { SettingsState } from "@/store/settingsTypes";
import BrowserBanner from "./pages/BrowserBanner";
import useFlags from "@/hooks/useFlags";
import { selectSettings } from "@/store/settingsSelectors";

// Register the built-in bricks
registerEditors();
registerBuiltinBlocks();
registerContribBlocks();

const RequireInstall: React.FunctionComponent = ({ children }) => {
  const mode = useSelector<{ settings: SettingsState }, string>(
    ({ settings }) => settings.mode
  );
  const [linked, isPending] = useAsyncState(isLinked);

  if (isPending && mode === "remote") {
    return null;
  }

  if (mode === "remote" && !linked) {
    return <SetupPage />;
  }

  return <>{children}</>;
};

const Layout = () => {
  // Get the latest brick definitions. Put it here in Layout instead of App to ensure the Redux store has been hydrated
  // by the time refresh is called.
  useRefresh();

  const { permit } = useFlags();
  const { isBlueprintsPageEnabled } = useSelector(selectSettings);

  const { isLoading } = useGetAuthQuery();

  if (isLoading) {
    return <GridLoader />;
  }

  return (
    <div className="w-100">
      <Navbar />
      <Container fluid className="page-body-wrapper">
        <RequireInstall>
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

                  {!isBlueprintsPageEnabled && (
                    <Route
                      exact
                      path="/blueprints"
                      component={MarketplacePage}
                    />
                  )}

                  {isBlueprintsPageEnabled ? (
                    <Route component={BlueprintsPage} />
                  ) : (
                    <Route component={InstalledPage} />
                  )}
                </Switch>
              </ErrorBoundary>
            </div>
            <Footer />
          </div>
        </RequireInstall>
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
      <PersistGate loading={<GridLoader />} persistor={persistor}>
        <ConnectedRouter history={hashHistory}>
          <ModalProvider>
            <ToastProvider>
              <Layout />
            </ToastProvider>
          </ModalProvider>
        </ConnectedRouter>
      </PersistGate>
    </Provider>
  );
};

export default App;
