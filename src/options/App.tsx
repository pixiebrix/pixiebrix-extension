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

import React, { useState } from "react";
import store, { hashHistory, persistor } from "./store";
import useAsyncEffect from "use-async-effect";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { GridLoader } from "react-spinners";
import Container from "react-bootstrap/Container";
import ErrorBoundary from "@/components/ErrorBoundary";
import InstalledExtensions from "@/options/pages/Installed";
import ExtensionEditor from "@/options/pages/extensionEditor/ExtensionEditor";
import ServicesEditor from "@/options/pages/services/ServicesEditor";
import BrickCreatePage from "@/options/pages/brickEditor/CreatePage";
import BrickEditPage from "@/options/pages/brickEditor/EditPage";
import MarketplacePage from "@/options/pages/MarketplacePage";
import Settings from "./pages/Settings";
import Navbar from "@/layout/Navbar";
import Footer from "@/layout/Footer";
import Sidebar from "@/layout/Sidebar";
import { Route, Switch } from "react-router-dom";
import { ConnectedRouter } from "connected-react-router";
import { ToastProvider, useToasts } from "react-toast-notifications";
import extensionPointRegistry from "@/extensionPoints/registry";
import blockRegistry from "@/blocks/registry";
import serviceRegistry from "@/services/registry";
import "vendors/theme/app/app.scss";
import { AuthContext } from "@/auth/context";
import axios from "axios";
import { useAsyncState } from "@/hooks/common";
import urljoin from "url-join";
import { getBaseURL } from "@/services/baseService";
import Banner from "@/layout/Banner";
import ActivatePage from "@/options/pages/marketplace/ActivatePage";
import { refresh as refreshLocator } from "@/background/locator";

// import the built-in bricks
import "@/blocks";
import "@/contrib";

const Layout = () => {
  const [loaded, setLoaded] = useState(false);
  const { addToast } = useToasts();

  useAsyncEffect(async (isMounted) => {
    try {
      await Promise.all([
        extensionPointRegistry.fetch(),
        blockRegistry.fetch(),
        serviceRegistry.fetch(),
        refreshLocator(),
      ]);
    } catch (exc) {
      console.exception(exc);
      if (!isMounted()) return;
      addToast("Error refreshing blocks from server", {
        appearance: "error",
        autoDismiss: true,
      });
    } finally {
      if (isMounted()) {
        setLoaded(true);
      }
    }
  }, []);

  // FIXME: figure out correct scrolling with fixed navbar
  // <div className="container-scroller">

  return (
    <div className="w-100">
      <Navbar />
      <Container fluid className="page-body-wrapper">
        <Sidebar />
        <div className="main-panel">
          <Banner />
          <div className="content-wrapper">
            {loaded ? (
              <ErrorBoundary>
                <Switch>
                  <Route
                    exact
                    path="/marketplace"
                    component={MarketplacePage}
                  />
                  <Route
                    exact
                    path="/marketplace/activate/:blueprintId"
                    component={ActivatePage}
                  />
                  <Route exact path="/settings" component={Settings} />
                  <Route path="/services/:id?" component={ServicesEditor} />
                  <Route exact path="/workshop" component={ExtensionEditor} />
                  <Route
                    path="/workshop/install/:extensionPointId"
                    component={ExtensionEditor}
                  />
                  <Route
                    exact
                    path="/workshop/create/"
                    component={BrickCreatePage}
                  />
                  <Route
                    exact
                    path="/workshop/bricks/:id/"
                    component={BrickEditPage}
                  />
                  <Route
                    path="/workshop/extensions/:extensionId/:tab?"
                    component={ExtensionEditor}
                  />
                  <Route component={InstalledExtensions} />
                </Switch>
              </ErrorBoundary>
            ) : (
              <GridLoader />
            )}
          </div>
          <Footer />
        </div>
      </Container>
    </div>
  );
};

async function getAuth() {
  const serviceUrl = await getBaseURL();
  const { data } = await axios.get(urljoin(serviceUrl, "api", "me", "/"));
  const { id, email } = data;
  if (id) {
    return {
      userId: id,
      email: email,
      isLoggedIn: true,
      extension: true,
    };
  } else {
    return {
      userId: undefined,
      email: undefined,
      isLoggedIn: false,
      extension: true,
    };
  }
}

const App: React.FunctionComponent = () => {
  const [authState] = useAsyncState(getAuth);

  return (
    <Provider store={store}>
      <PersistGate loading={<GridLoader />} persistor={persistor}>
        <AuthContext.Provider
          value={authState ?? { isLoggedIn: false, extension: true }}
        >
          <ConnectedRouter history={hashHistory}>
            <ToastProvider>
              <Layout />
            </ToastProvider>
          </ConnectedRouter>
        </AuthContext.Provider>
      </PersistGate>
    </Provider>
  );
};

export default App;
