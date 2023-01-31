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

import React, { useCallback, useEffect } from "react";
import { type PanelEntry, type SidebarEntries } from "@/sidebar/types";
import { mapTabEventKey } from "@/sidebar/utils";
import { type UUID } from "@/core";
import { reportEvent } from "@/telemetry/events";
import { CloseButton, Nav, Tab } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import ErrorBoundary from "@/components/ErrorBoundary";
import PanelBody from "@/sidebar/PanelBody";
import FormBody from "@/sidebar/FormBody";
import styles from "./Tabs.module.scss";
import cx from "classnames";
import { BusinessError } from "@/errors/businessErrors";
import { type SubmitPanelAction } from "@/blocks/errors";
import ReactShadowRoot from "react-shadow-root";

type SidebarTabsProps = SidebarEntries & {
  activeKey: string;
  onSelectTab: (eventKey: string) => void;
  onCloseTemporaryTab: (nonce: UUID) => void;
  onResolveTemporaryPanel: (nonce: UUID, action: SubmitPanelAction) => void;
};

const permanentSidebarPanelAction = () => {
  throw new BusinessError("Action not supported for permanent sidebar panels");
};

const Tabs: React.FunctionComponent<SidebarTabsProps> = ({
  activeKey,
  panels,
  forms,
  temporaryPanels,
  recipeToActivate,
  onSelectTab,
  onCloseTemporaryTab,
  onResolveTemporaryPanel,
}) => {
  const onSelect = useCallback(
    (eventKey: string) => {
      reportEvent("ViewSidePanelPanel", {
        // FIXME: this was wrong, eventKey is not an extensionId
        // ...selectEventData(lookup.get(extensionId)),
        initialLoad: false,
      });
      onSelectTab(eventKey);
    },
    [onSelectTab]
  );

  useEffect(
    () => {
      reportEvent("ViewSidePanelPanel", {
        // FIXME: this was wrong, eventKey is not an extensionId
        // ...selectEventData(lookup.get(activeKey)),
        initialLoad: true,
      });
    },
    // Only run on initial mount, other views are handled by onSelect
    []
  );

  return (
    <Tab.Container
      id="panel-container"
      defaultActiveKey={activeKey}
      activeKey={activeKey}
    >
      <div className="full-height bg-white">
        <Nav fill variant="tabs" onSelect={onSelect}>
          {panels.map((panel) => (
            <Nav.Link
              key={panel.extensionId}
              eventKey={mapTabEventKey("panel", panel)}
              className={styles.tabHeader}
            >
              <span className={styles.tabTitle}>
                {panel.heading ?? <FontAwesomeIcon icon={faSpinner} />}
              </span>
            </Nav.Link>
          ))}
          {forms.map((form) => (
            <Nav.Link
              key={form.extensionId}
              eventKey={mapTabEventKey("form", form)}
              className={styles.tabHeader}
            >
              <span className={styles.tabTitle}>
                {form.form.schema.title ?? "Form"}
              </span>
            </Nav.Link>
          ))}
          {temporaryPanels.map((panel) => (
            <Nav.Link
              key={panel.nonce}
              eventKey={mapTabEventKey("temporaryPanel", panel)}
              className={styles.tabHeader}
            >
              <span className={styles.tabTitle}>{panel.heading}</span>
              <CloseButton
                onClick={() => {
                  onCloseTemporaryTab(panel.nonce);
                }}
              />
            </Nav.Link>
          ))}
          {recipeToActivate && (
            <Nav.Link
              key={recipeToActivate.recipeId}
              eventKey={`activate-${recipeToActivate.recipeId}`}
              className={styles.tabHeader}
            >
              <span className={styles.tabTitle}>
                {recipeToActivate.heading}
              </span>
            </Nav.Link>
          )}
        </Nav>
        <Tab.Content className="p-0 border-0 full-height scrollable-area">
          {panels.map((panel: PanelEntry) => (
            <Tab.Pane
              className={cx("full-height flex-grow", styles.paneOverrides)}
              key={panel.extensionId}
              eventKey={mapTabEventKey("panel", panel)}
            >
              <ErrorBoundary>
                <PanelBody
                  isRootPanel
                  payload={panel.payload}
                  onAction={permanentSidebarPanelAction}
                  context={{
                    extensionId: panel.extensionId,
                    extensionPointId: panel.extensionPointId,
                    blueprintId: panel.blueprintId,
                  }}
                />
              </ErrorBoundary>
            </Tab.Pane>
          ))}
          {forms.map((form) => (
            <Tab.Pane
              className="full-height flex-grow"
              key={form.nonce}
              eventKey={mapTabEventKey("form", form)}
            >
              <ErrorBoundary>
                <FormBody form={form} />
              </ErrorBoundary>
            </Tab.Pane>
          ))}
          {temporaryPanels.map((panel) => (
            <Tab.Pane
              className={cx("full-height flex-grow", styles.paneOverrides)}
              key={panel.nonce}
              eventKey={mapTabEventKey("temporaryPanel", panel)}
            >
              <ErrorBoundary>
                <PanelBody
                  isRootPanel={false}
                  payload={panel.payload}
                  context={{ extensionId: panel.extensionId }}
                  onAction={(action: SubmitPanelAction) => {
                    onResolveTemporaryPanel(panel.nonce, action);
                  }}
                />
              </ErrorBoundary>
            </Tab.Pane>
          ))}
          {recipeToActivate && (
            <Tab.Pane
              className={cx("full-height flex-grow", styles.paneOverrides)}
              key={recipeToActivate.recipeId}
              eventKey={`activate-${recipeToActivate.recipeId}`}
            >
              <ErrorBoundary>
                <ReactShadowRoot>
                  <div>
                    <h3>
                      Hello from sidebar, activating blueprint{" "}
                      {recipeToActivate.recipeId}
                    </h3>
                  </div>
                </ReactShadowRoot>
              </ErrorBoundary>
            </Tab.Pane>
          )}
        </Tab.Content>
      </div>
    </Tab.Container>
  );
};

export default Tabs;
