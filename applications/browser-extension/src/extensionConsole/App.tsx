/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import store, { hashHistory, persistor } from "@/extensionConsole/store";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { Container } from "react-bootstrap";
import ErrorBoundary from "@/components/ErrorBoundary";
import ServicesEditor from "@/extensionConsole/pages/integrations/IntegrationsPage";
import BrickCreatePage from "@/extensionConsole/pages/packageEditor/CreatePage";
import BrickEditPage from "@/extensionConsole/pages/packageEditor/EditPage";
import ModsPage from "@/extensionConsole/pages/mods/ModsPage";
import SettingsPage from "@/extensionConsole/pages/settings/SettingsPage";
import Navbar from "@/extensionConsole/Navbar";
import Footer from "@/layout/Footer";
import Sidebar from "@/extensionConsole/Sidebar";
import { Route, Switch } from "react-router-dom";
import { ConnectedRouter } from "connected-react-router";
import EnvironmentBanner from "@/layout/EnvironmentBanner";
import SetupPage from "@/extensionConsole/pages/onboarding/SetupPage";
import UpdateBanner from "@/extensionConsole/pages/UpdateBanner";
import registerBuiltinBricks from "@/bricks/registerBuiltinBricks";
import registerContribBricks from "@/contrib/registerContribBricks";
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
import ReduxPersistenceContext, {
  type ReduxPersistenceContextType,
} from "@/store/ReduxPersistenceContext";
import IDBErrorDisplay from "@/extensionConsole/components/IDBErrorDisplay";
import { DeploymentsProvider } from "@/extensionConsole/pages/deployments/DeploymentsContext";
import DatabaseUnresponsiveBanner from "@/components/DatabaseUnresponsiveBanner";
import ActivateModPage from "@/extensionConsole/pages/activateMod/ActivateModPage";
import { RestrictedFeatures } from "@/auth/featureFlags";
import { useLocation } from "react-router";
import TeamTrialBanner from "@/components/teamTrials/TeamTrialBanner";
import usePollModLogs from "@/components/logViewer/usePollModLogs";

// Register the built-in bricks
registerEditors();
registerBuiltinBricks();
registerContribBricks();

// Register Widgets
registerDefaultWidgets();

const AuthenticatedContent: React.VFC = () => {
  const { permit } = useFlags();
  usePollModLogs();

  return (
    <DeploymentsProvider>
      <Sidebar />
      <div className="main-panel">
        <DatabaseUnresponsiveBanner />
        <BrowserBanner />
        <EnvironmentBanner />
        <UpdateBanner />
        <DeploymentBanner />
        <InvitationBanner />
        <TeamTrialBanner />
        <div className="content-wrapper">
          <ErrorBoundary ErrorComponent={IDBErrorDisplay}>
            <Switch>
              <Route
                exact
                path="/:sourcePage/activate/:registryId"
                component={ActivateModPage}
              />

              <Route exact path="/settings" component={SettingsPage} />

              {permit(RestrictedFeatures.LOCAL_INTEGRATIONS) && (
                <Route path="/services/:id?" component={ServicesEditor} />
              )}

              {/* Switch does not support consolidating Routes using a React fragment */}
              {permit(RestrictedFeatures.WORKSHOP) && (
                <Route exact path="/workshop" component={WorkshopPage} />
              )}

              {permit(RestrictedFeatures.WORKSHOP) && (
                <Route
                  exact
                  path="/workshop/create/"
                  component={BrickCreatePage}
                />
              )}

              {permit(RestrictedFeatures.WORKSHOP) && (
                <Route
                  exact
                  path="/workshop/bricks/:id/"
                  component={BrickEditPage}
                />
              )}

              <Route component={ModsPage} />
            </Switch>
          </ErrorBoundary>
        </div>
        <Footer />
      </div>
    </DeploymentsProvider>
  );
};

const Layout = () => {
  const {
    activeTheme: { logo },
    isLoading: themeIsLoading,
  } = useTheme();

  const location = useLocation();

  return (
    <div>
      {!themeIsLoading && <Navbar logo={logo} />}
      <Container fluid className="page-body-wrapper">
        {/* It is guaranteed that under RequireAuth the user has a valid API token (either PixieBrix token or partner JWT). */}
        <ErrorBoundary ErrorComponent={IDBErrorDisplay}>
          <RequireAuth LoginPage={SetupPage} location={location}>
            <AuthenticatedContent />
          </RequireAuth>
        </ErrorBoundary>
      </Container>
    </div>
  );
};

const persistorContext: ReduxPersistenceContextType = {
  async flush() {
    await persistor.flush();
  },
};

const App: React.FunctionComponent = () => (
  <Provider store={store}>
    <PersistGate persistor={persistor}>
      <ReduxPersistenceContext.Provider value={persistorContext}>
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
