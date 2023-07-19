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
  type SidebarEntry,
  type TemporaryPanelEntry,
} from "@/types/sidebarTypes";
import { eventKeyForEntry, getBodyForStaticPanel } from "@/sidebar/utils";
import { type UUID } from "@/types/stringTypes";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { CloseButton, Nav, type NavLinkProps, Tab } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import PanelBody from "@/sidebar/PanelBody";
import FormBody from "@/sidebar/FormBody";
import styles from "./Tabs.module.scss";
import cx from "classnames";
import { BusinessError } from "@/errors/businessErrors";
import { type SubmitPanelAction } from "@/bricks/errors";
import ActivateRecipePanel from "@/sidebar/activateRecipe/ActivateRecipePanel";
import { useDispatch, useSelector } from "react-redux";
import {
  selectExtensionFromEventKey,
  selectSidebarActiveTabKey,
  selectSidebarForms,
  selectSidebarPanels,
  selectSidebarRecipeToActivate,
  selectSidebarStaticPanels,
  selectSidebarTemporaryPanels,
} from "@/sidebar/sidebarSelectors";
import sidebarSlice from "@/sidebar/sidebarSlice";
import { selectEventData } from "@/telemetry/deployments";
import ErrorBoundary from "@/sidebar/ErrorBoundary";

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
  const { type, extensionId, blueprintId, payload } = panel;

  return (
    <Tab.Pane
      className={cx("full-height flex-grow", styles.paneOverrides)}
      eventKey={eventKeyForEntry(panel)}
    >
      <ErrorBoundary
        onError={() => {
          reportEvent(Events.VIEW_ERROR, {
            panelType: type,
            extensionId,
            blueprintId,
          });
        }}
      >
        <PanelBody
          isRootPanel={false}
          payload={payload}
          context={{
            extensionId,
            blueprintId,
          }}
          onAction={onAction}
        />
      </ErrorBoundary>
    </Tab.Pane>
  );
});
TemporaryPanelTabPane.displayName = "TemporaryPanelTabPane";

const TabWithDivider = ({ children, active, ...props }: NavLinkProps) => (
  <Nav.Item className={cx(styles.tabWrapper, { [styles.active]: active })}>
    <Nav.Link {...props} className={styles.tabHeader}>
      {children}
    </Nav.Link>
    <div className={styles.tabDivider} />
  </Nav.Item>
);

const Tabs: React.FC = () => {
  const dispatch = useDispatch();
  const activeKey = useSelector(selectSidebarActiveTabKey);
  const panels = useSelector(selectSidebarPanels);
  const forms = useSelector(selectSidebarForms);
  const temporaryPanels = useSelector(selectSidebarTemporaryPanels);
  const recipeToActivate = useSelector(selectSidebarRecipeToActivate);
  const staticPanels = useSelector(selectSidebarStaticPanels);
  const getExtensionFromEventKey = useSelector(selectExtensionFromEventKey);

  const onSelect = (eventKey: string) => {
    reportEvent(Events.VIEW_SIDE_BAR_PANEL, {
      ...selectEventData(getExtensionFromEventKey(eventKey)),
      initialLoad: false,
    });
    dispatch(sidebarSlice.actions.selectTab(eventKey));
  };

  const onCloseTemporaryTab = (nonce: UUID) => {
    dispatch(sidebarSlice.actions.removeTemporaryPanel(nonce));
  };

  useEffect(
    () => {
      reportEvent(Events.VIEW_SIDE_BAR_PANEL, {
        ...selectEventData(getExtensionFromEventKey(activeKey)),
        initialLoad: true,
      });
    },
    // Only run on initial mount, other views are handled by onSelect
    []
  );

  const isPanelActive = (key: SidebarEntry) =>
    eventKeyForEntry(key) === activeKey;

  return (
    <Tab.Container
      id="panel-container"
      defaultActiveKey={activeKey}
      activeKey={activeKey}
    >
      <div className="full-height">
        <Nav
          justify
          variant="tabs"
          className={styles.tabContainer}
          onSelect={onSelect}
        >
          {staticPanels.map((staticPanel) => (
            <TabWithDivider
              key={staticPanel.key}
              active={isPanelActive(staticPanel)}
              eventKey={eventKeyForEntry(staticPanel)}
            >
              <span className={styles.tabTitle}>{staticPanel.heading}</span>
            </TabWithDivider>
          ))}
          {panels.map((panel) => (
            <TabWithDivider
              key={panel.extensionId}
              active={isPanelActive(panel)}
              eventKey={eventKeyForEntry(panel)}
            >
              <span className={styles.tabTitle}>
                {panel.heading ?? <FontAwesomeIcon icon={faSpinner} />}
              </span>
            </TabWithDivider>
          ))}
          {forms.map((form) => (
            <TabWithDivider
              key={form.extensionId}
              active={isPanelActive(form)}
              eventKey={eventKeyForEntry(form)}
            >
              <span className={styles.tabTitle}>
                {form.form.schema.title ?? "Form"}
              </span>
            </TabWithDivider>
          ))}

          {temporaryPanels.map((panel) => (
            <TabWithDivider
              key={panel.nonce}
              active={isPanelActive(panel)}
              eventKey={eventKeyForEntry(panel)}
            >
              <span className={styles.tabTitle}>{panel.heading}</span>
              <CloseButton
                onClick={() => {
                  onCloseTemporaryTab(panel.nonce);
                }}
              />
            </TabWithDivider>
          ))}
          {recipeToActivate && (
            <TabWithDivider
              key={recipeToActivate.recipeId}
              active={isPanelActive(recipeToActivate)}
              eventKey={eventKeyForEntry(recipeToActivate)}
            >
              <span className={styles.tabTitle}>
                {recipeToActivate.heading}
              </span>
            </TabWithDivider>
          )}
        </Nav>
        <Tab.Content className="p-0 border-0 full-height bg-white">
          {staticPanels.map((staticPanel) => (
            <Tab.Pane
              className={cx("h-100", styles.paneOverrides)}
              key={staticPanel.key}
              eventKey={eventKeyForEntry(staticPanel)}
            >
              <ErrorBoundary
                onError={() => {
                  reportEvent(Events.VIEW_ERROR, {
                    panelType: staticPanel.type,
                  });
                }}
              >
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
              <ErrorBoundary
                onError={() => {
                  reportEvent(Events.VIEW_ERROR, {
                    panelType: panel.type,
                    extensionId: panel.extensionId,
                    blueprintId: panel.blueprintId,
                  });
                }}
              >
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
              <ErrorBoundary
                onError={() => {
                  reportEvent(Events.VIEW_ERROR, {
                    panelType: form.type,
                    extensionId: form.extensionId,
                    blueprintId: form.blueprintId,
                  });
                }}
              >
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
              <ErrorBoundary
                onError={() => {
                  reportEvent(Events.VIEW_ERROR, {
                    panelType: "activate",
                    recipeToActivate: recipeToActivate.recipeId,
                  });
                }}
              >
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
