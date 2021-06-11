/*
 * Copyright (C) 2021 Pixie Brix, LLC
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

import React, { useCallback, useEffect, useState } from "react";
import { Button, Card, Nav, Tab } from "react-bootstrap";
import { openExtensionOptions } from "@/messaging/external";

import ErrorBoundary from "@/components/ErrorBoundary";
import logo from "@img/logo.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPuzzlePiece } from "@fortawesome/free-solid-svg-icons";
import { getStore } from "@/actionPanel/native";
import {
  ActionPanelStore,
  addListener,
  PanelEntry,
  removeListener,
} from "@/actionPanel/protocol";
import PanelBody from "@/actionPanel/PanelBody";
import DefaultActionPanel from "@/actionPanel/DefaultActionPanel";
import DeploymentBanner from "@/options/pages/deployments/DeploymentBanner";
import { ToastProvider } from "react-toast-notifications";
import store, { persistor } from "@/options/store";
import { Provider } from "react-redux";
import GridLoader from "react-spinners/GridLoader";
import { PersistGate } from "redux-persist/integration/react";

const ActionPanelTabs: React.FunctionComponent<{ panels: PanelEntry[] }> = ({
  panels,
}) => {
  const [key, setKey] = useState(panels[0]?.extensionId);

  return (
    <Card>
      <Tab.Container id="panel-container" defaultActiveKey={key}>
        <Card.Header>
          <Nav variant="tabs" onSelect={setKey}>
            {panels.map((panel) => (
              <Nav.Link key={panel.extensionId} eventKey={panel.extensionId}>
                {panel.heading ?? "..."}
              </Nav.Link>
            ))}
          </Nav>
        </Card.Header>
        <Card.Body className="p-0" style={{ overflowY: "auto" }}>
          <Tab.Content className="p-0">
            {panels.map((panel) => (
              <Tab.Pane key={panel.extensionId} eventKey={panel.extensionId}>
                <ErrorBoundary>
                  <PanelBody panel={panel} />
                </ErrorBoundary>
              </Tab.Pane>
            ))}
          </Tab.Content>
        </Card.Body>
      </Tab.Container>
    </Card>
  );
};

const ActionPanelApp: React.FunctionComponent = () => {
  const [{ panels }, setStoreState] = useState<ActionPanelStore>(getStore());

  const syncPanels = useCallback(
    (store: ActionPanelStore) => {
      setStoreState(store);
    },
    [setStoreState]
  );

  useEffect(() => {
    addListener(syncPanels);
    return () => removeListener(syncPanels);
  }, [syncPanels]);

  return (
    <Provider store={store}>
      <PersistGate loading={<GridLoader />} persistor={persistor}>
        <ToastProvider>
          <div className="d-flex flex-column" style={{ maxHeight: "100vh" }}>
            <div className="d-flex mb-2" style={{ flex: "none" }}>
              <div className="align-self-center">
                <img
                  src={logo}
                  alt="PixieBrix logo"
                  height={20}
                  className="px-2"
                />
              </div>
              <div className="flex-grow-1"></div>
              <div className="ActionPanelToolbar">
                <Button
                  onClick={() => openExtensionOptions()}
                  size="sm"
                  variant="info"
                >
                  <FontAwesomeIcon icon={faPuzzlePiece} /> Open Extension
                </Button>
              </div>
            </div>

            <DeploymentBanner className="flex-none" />

            <div className="mt-2" style={{ minHeight: 1, flex: "1 1 auto" }}>
              {panels?.length ? (
                <ActionPanelTabs panels={panels} />
              ) : (
                <DefaultActionPanel />
              )}
            </div>
          </div>
        </ToastProvider>
      </PersistGate>
    </Provider>
  );
};

export default ActionPanelApp;
