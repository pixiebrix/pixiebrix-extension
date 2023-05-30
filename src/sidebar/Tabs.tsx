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
import {
  type PanelEntry,
  type TemporaryPanelEntry,
} from "@/types/sidebarTypes";
import { eventKeyForEntry, getBodyForStaticPanel } from "@/sidebar/utils";
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
  selectSidebarForms,
  selectSidebarPanels,
  selectSidebarRecipeToActivate,
  selectSidebarStaticPanels,
  selectSidebarTemporaryPanels,
} from "@/sidebar/sidebarSelectors";
import sidebarSlice from "@/sidebar/sidebarSlice";

const permanentSidebarPanelAction = () => {
  throw new BusinessError("Action not supported for permanent sidebar panels");
};

// Need to memoize this to make sure it doesn't rerender unless its entry actually changes
// This was part of the fix for issue: https://github.com/pixiebrix/pixiebrix-extension/issues/5646
const TemporaryPanelTabPane: React.FC<{
  panel: TemporaryPanelEntry;
}> = React.memo(({ panel }) => {
  const dispatch = useDispatch();
  const onAction = useCallback(
    (action: SubmitPanelAction) => {
      dispatch(
        sidebarSlice.actions.resolveTemporaryPanel({
          nonce: panel.nonce,
          action,
        })
      );
    },
    [dispatch, panel.nonce]
  );

  return (
    <Tab.Pane
      className={cx("full-height flex-grow", styles.paneOverrides)}
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
          onAction={onAction}
        />
      </ErrorBoundary>
    </Tab.Pane>
  );
});
TemporaryPanelTabPane.displayName = "TemporaryPanelTabPane";

const Tabs: React.FC = () => {
  const dispatch = useDispatch();
  const activeKey = useSelector(selectSidebarActiveTabKey);
  const panels = useSelector(selectSidebarPanels);
  const forms = useSelector(selectSidebarForms);
  const temporaryPanels = useSelector(selectSidebarTemporaryPanels);
  const recipeToActivate = useSelector(selectSidebarRecipeToActivate);
  const staticPanels = useSelector(selectSidebarStaticPanels);

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
          {staticPanels.map((staticPanel) => (
            <Nav.Link
              key={staticPanel.key}
              className={styles.tabHeader}
              eventKey={eventKeyForEntry(staticPanel)}
            >
              <span className={styles.tabTitle}>{staticPanel.heading}</span>
            </Nav.Link>
          ))}
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
          {staticPanels.map((staticPanel) => (
            <Tab.Pane
              className={cx("h-100", styles.paneOverrides)}
              key={staticPanel.key}
              eventKey={eventKeyForEntry(staticPanel)}
            >
              <ErrorBoundary>
                {getBodyForStaticPanel(staticPanel.key)}
              </ErrorBoundary>
            </Tab.Pane>
          ))}
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
            <TemporaryPanelTabPane panel={panel} key={panel.nonce} />
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
