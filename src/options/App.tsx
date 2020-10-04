import React, { useState } from "react";
import store, { persistor, hashHistory } from "./store";
import useAsyncEffect from "use-async-effect";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { GridLoader } from "react-spinners";
import Container from "react-bootstrap/Container";
import ErrorBoundary from "@/components/ErrorBoundary";
import InstalledExtensions from "./pages/Installed";
import ExtensionEditor from "./pages/extensionEditor/ExtensionEditor";
import ServicesEditor from "./pages/services/ServicesEditor";
import BrickCreatePage from "./pages/brickEditor/CreatePage";
import BrickEditPage from "./pages/brickEditor/EditPage";
import Marketplace from "./pages/Marketplace";
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

import "@/blocks"; // Import for the side effect

import "vendors/theme/app/app.scss";
import { AuthContext } from "@/auth/context";
import axios from "axios";
import { useAsyncState } from "@/hooks/common";
import urljoin from "url-join";
import { getBaseURL } from "@/services/baseService";

const Layout = ({}) => {
  const [loaded, setLoaded] = useState(false);
  const { addToast } = useToasts();

  useAsyncEffect(async (isMounted) => {
    try {
      await Promise.all([
        extensionPointRegistry.fetch(),
        blockRegistry.fetch(),
        serviceRegistry.fetch(),
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
          <div className="content-wrapper">
            {loaded ? (
              <ErrorBoundary>
                <Switch>
                  <Route exact path="/marketplace" component={Marketplace} />
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
                    path="/workshop/extensions/:extensionId"
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

const App = ({}) => {
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
