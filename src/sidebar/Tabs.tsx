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
import { type PanelEntry } from "@/types/sidebarTypes";
import { eventKeyForEntry } from "@/sidebar/utils";
import { type UUID } from "@/types/stringTypes";
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
import ActivateRecipePanel from "@/sidebar/activateRecipe/ActivateRecipePanel";
import { useDispatch, useSelector } from "react-redux";
import {
  selectSidebarActiveTabKey,
  selectSidebarTabsContent,
} from "@/sidebar/sidebarSelectors";
import sidebarSlice from "@/sidebar/sidebarSlice";
import HomePanel, { HOME_PANEL } from "@/sidebar/HomePanel";

const permanentSidebarPanelAction = () => {
  throw new BusinessError("Action not supported for permanent sidebar panels");
};

const Tabs: React.FC = () => {
  const dispatch = useDispatch();
  const activeKey = useSelector(selectSidebarActiveTabKey);
  const { panels, forms, temporaryPanels, recipeToActivate } = useSelector(
    selectSidebarTabsContent
  );

  const onSelect = (eventKey: string) => {
    reportEvent("ViewSidePanelPanel", {
      // FIXME: this was wrong, eventKey is not an extensionId
      // ...selectEventData(lookup.get(extensionId)),
      initialLoad: false,
    });
    dispatch(sidebarSlice.actions.selectTab(eventKey));
  };

  const onCloseTemporaryTab = (nonce: UUID) => {
    dispatch(sidebarSlice.actions.removeTemporaryPanel(nonce));
  };

  const onResolveTemporaryPanel = (nonce: UUID, action: SubmitPanelAction) => {
    dispatch(sidebarSlice.actions.resolveTemporaryPanel({ nonce, action }));
  };

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
          <Nav.Link
            key="home-panel"
            className={styles.tabHeader}
            eventKey={eventKeyForEntry(HOME_PANEL)}
          >
            <span className={styles.tabTitle}>{HOME_PANEL.heading}</span>
          </Nav.Link>
          {panels.map((panel) => (
            <Nav.Link
              key={panel.extensionId}
              eventKey={eventKeyForEntry(panel)}
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
              eventKey={eventKeyForEntry(form)}
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
              eventKey={eventKeyForEntry(panel)}
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
              eventKey={eventKeyForEntry(recipeToActivate)}
              className={styles.tabHeader}
            >
              <span className={styles.tabTitle}>
                {recipeToActivate.heading}
              </span>
            </Nav.Link>
          )}
        </Nav>
        <Tab.Content className="p-0 border-0 full-height">
          <Tab.Pane
            className={cx("h-100", styles.paneOverrides)}
            key="home-panel"
            eventKey={eventKeyForEntry(HOME_PANEL)}
          >
            <ErrorBoundary>
              <HomePanel />
            </ErrorBoundary>
          </Tab.Pane>
          {panels.map((panel: PanelEntry) => (
            <Tab.Pane
              className={cx("full-height flex-grow", styles.paneOverrides)}
              key={panel.extensionId}
              eventKey={eventKeyForEntry(panel)}
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
              eventKey={eventKeyForEntry(form)}
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
              eventKey={eventKeyForEntry(panel)}
            >
              <ErrorBoundary>
                <PanelBody
                  isRootPanel={false}
                  payload={panel.payload}
                  context={{
                    extensionId: panel.extensionId,
                    blueprintId: panel.blueprintId,
                  }}
                  onAction={(action: SubmitPanelAction) => {
                    onResolveTemporaryPanel(panel.nonce, action);
                  }}
                />
              </ErrorBoundary>
            </Tab.Pane>
          ))}
          {recipeToActivate && (
            <Tab.Pane
              className={cx("h-100", styles.paneOverrides)}
              key={recipeToActivate.recipeId}
              eventKey={eventKeyForEntry(recipeToActivate)}
            >
              <ErrorBoundary>
                <ActivateRecipePanel recipeId={recipeToActivate.recipeId} />
              </ErrorBoundary>
            </Tab.Pane>
          )}
        </Tab.Content>
      </div>
    </Tab.Container>
  );
};

export default Tabs;
