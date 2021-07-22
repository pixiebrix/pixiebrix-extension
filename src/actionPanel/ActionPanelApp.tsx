/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useCallback, useEffect, useState } from "react";
import { Button, Card, Nav, Tab } from "react-bootstrap";
import { openExtensionOptions } from "@/messaging/external";
import ErrorBoundary from "@/components/ErrorBoundary";
import logo from "@img/logo.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPuzzlePiece, faSpinner } from "@fortawesome/free-solid-svg-icons";
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
import { browser } from "webextension-polyfill-ts";
import { HIDE_ACTION_FRAME } from "@/background/browserAction";
import doubleChevronRight from "bootstrap-icons/icons/chevron-double-right.svg";

const closeSidebar = async () => {
  await browser.runtime.sendMessage({
    type: HIDE_ACTION_FRAME,
    payload: {},
  });
};

const ActionPanelTabs: React.FunctionComponent<{ panels: PanelEntry[] }> = ({
  panels,
}) => {
  const [key, setKey] = useState(panels[0]?.extensionId);

  return (
    <Tab.Container id="panel-container" defaultActiveKey={key}>
      <Card className="h-100">
        <Card.Header>
          <Nav variant="tabs" onSelect={setKey}>
            {panels.map((panel) => (
              <Nav.Link key={panel.extensionId} eventKey={panel.extensionId}>
                {panel.heading ?? <FontAwesomeIcon icon={faSpinner} />}
              </Nav.Link>
            ))}
          </Nav>
        </Card.Header>
        <Card.Body className="p-0 flex-grow-1" style={{ overflowY: "auto" }}>
          <Tab.Content className="p-0 h-100">
            {panels.map((panel) => (
              <Tab.Pane
                className="h-100"
                key={panel.extensionId}
                eventKey={panel.extensionId}
                style={{ minHeight: "1px" }}
              >
                <ErrorBoundary>
                  <PanelBody panel={panel} />
                </ErrorBoundary>
              </Tab.Pane>
            ))}
          </Tab.Content>
        </Card.Body>
      </Card>
    </Tab.Container>
  );
};

const ActionPanelApp: React.FunctionComponent = () => {
  const [{ panels }, setStoreState] = useState(getStore());

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
          <div className="d-flex flex-column" style={{ height: "100vh" }}>
            <div className="d-flex mb-2" style={{ flex: "none" }}>
              <Button
                id="closeSidebarButton"
                onClick={closeSidebar}
                size="sm"
                variant="link"
                style={{ color: "#6562aa" }}
              >
                {/* <img src={doubleChevronRight}></img> */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-chevron-double-right"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill-rule="evenodd"
                    d="M3.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L9.293 8 3.646 2.354a.5.5 0 0 1 0-.708z"
                  />
                  <path
                    fill-rule="evenodd"
                    d="M7.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L13.293 8 7.646 2.354a.5.5 0 0 1 0-.708z"
                  />
                </svg>
              </Button>
              <div className="align-self-center">
                <img
                  src={logo}
                  alt="PixieBrix logo"
                  height={20}
                  className="px-2"
                />
              </div>
              {/* spacer */}
              <div className="flex-grow-1" />
              <div className="ActionPanelToolbar">
                <Button
                  onClick={async () => openExtensionOptions()}
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
