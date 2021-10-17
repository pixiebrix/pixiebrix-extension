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
import ErrorBoundary from "@/components/ErrorBoundary";
import logo from "@img/logo.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCog,
  faSpinner,
  faAngleDoubleRight,
} from "@fortawesome/free-solid-svg-icons";
import { getStore } from "@/actionPanel/native";
import {
  ActionPanelStore,
  addListener,
  PanelEntry,
  removeListener,
} from "@/actionPanel/protocol";
import PanelBody from "@/actionPanel/PanelBody";
import DefaultActionPanel from "@/actionPanel/DefaultActionPanel";
import { ToastProvider } from "react-toast-notifications";
import store, { persistor } from "@/options/store";
import { Provider } from "react-redux";
import GridLoader from "react-spinners/GridLoader";
import { PersistGate } from "redux-persist/integration/react";
import { reportEvent } from "@/telemetry/events";
import useExtensionMeta from "@/hooks/useExtensionMeta";
import { selectEventData } from "@/telemetry/deployments";
import { browserAction } from "@/background/messenger/api";
import { UUID } from "@/core";
import { ary } from "lodash";

const ActionPanelTabs: React.FunctionComponent<{ panels: PanelEntry[] }> = ({
  panels,
}) => {
  const initialKey = panels[0]?.extensionId;
  const [key, setKey] = useState(initialKey);
  const { lookup } = useExtensionMeta();

  const onSelect = useCallback(
    (extensionId: UUID) => {
      reportEvent("ViewSidePanelPanel", {
        ...selectEventData(lookup.get(extensionId)),
        initialLoad: false,
      });
      setKey(extensionId);
    },
    [setKey, lookup]
  );

  useEffect(
    () => {
      reportEvent("ViewSidePanelPanel", {
        ...selectEventData(lookup.get(initialKey)),
        initialLoad: true,
      });
    },
    // Only run on initial mount, other views are handled by onSelect
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <Tab.Container id="panel-container" defaultActiveKey={key}>
      <Card className="h-100">
        <Card.Header>
          <Nav variant="tabs" onSelect={onSelect}>
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
    return () => {
      removeListener(syncPanels);
    };
  }, [syncPanels]);

  return (
    <Provider store={store}>
      <PersistGate loading={<GridLoader />} persistor={persistor}>
        <ToastProvider>
          <div className="d-flex flex-column" style={{ height: "100vh" }}>
            <div className="d-flex flex-row mb-2 p-2 justify-content-between align-content-center">
              <Button
                className="action-panel-button"
                onClick={ary(browserAction.hideActionFrame, 0)}
                size="sm"
                variant="link"
              >
                <FontAwesomeIcon icon={faAngleDoubleRight} className="fa-lg" />
              </Button>
              <div className="align-self-center">
                <img
                  src={logo}
                  alt="PixieBrix logo"
                  height={20}
                  className="px-4"
                />
              </div>
              <Button
                href="/options.html"
                target="_blank"
                size="sm"
                variant="link"
                className="action-panel-button d-inline-flex align-items-center text-decoration-none"
              >
                <span>
                  Options <FontAwesomeIcon icon={faCog} />
                </span>
              </Button>
            </div>

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
