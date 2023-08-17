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

import React, { useEffect, type MouseEvent } from "react";
import {
  type PanelEntry,
  type SidebarEntry,
  isTemporaryPanelEntry,
  isFormPanelEntry,
} from "@/types/sidebarTypes";
import { eventKeyForEntry } from "@/sidebar/eventKeyUtils";
import { getBodyForStaticPanel } from "./staticPanelUtils";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import {
  CloseButton,
  Nav,
  type NavLinkProps,
  Tab,
  Button,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSpinner } from "@fortawesome/free-solid-svg-icons";
import PanelBody from "@/sidebar/PanelBody";
import FormBody from "@/sidebar/FormBody";
import styles from "./Tabs.module.scss";
import cx from "classnames";
import { BusinessError } from "@/errors/businessErrors";
import ActivateModPanel from "@/sidebar/activateRecipe/ActivateModPanel";
import { useDispatch, useSelector } from "react-redux";
import {
  selectExtensionFromEventKey,
  selectSidebarActiveTabKey,
  selectSidebarForms,
  selectSidebarPanels,
  selectSidebarModActivationPanel,
  selectSidebarStaticPanels,
  selectSidebarTemporaryPanels,
  selectClosedTabs,
  selectVisiblePanelCount,
} from "@/sidebar/sidebarSelectors";
import sidebarSlice from "@/sidebar/sidebarSlice";
import { selectEventData } from "@/telemetry/deployments";
import ErrorBoundary from "@/sidebar/ErrorBoundary";
import ActivateMultipleModsPanel from "@/sidebar/activateRecipe/ActivateMultipleModsPanel";
import useFlags from "@/hooks/useFlags";
import { TemporaryPanelTabPane } from "./TemporaryPanelTabPane";
import { MOD_LAUNCHER } from "@/sidebar/modLauncher/ModLauncher";
import { getTopLevelFrame } from "webext-messenger";
import { cancelForm, hideSidebar } from "@/contentScript/messenger/api";
import useAsyncEffect from "use-async-effect";

const permanentSidebarPanelAction = () => {
  throw new BusinessError("Action not supported for permanent sidebar panels");
};

const TabWithDivider = ({
  children,
  active,
  eventKey,
  ...props
}: NavLinkProps) => {
  const closedTabs = useSelector(selectClosedTabs);

  // eslint-disable-next-line security/detect-object-injection -- eventKey is not user input
  const isPanelHidden = closedTabs[eventKey];

  return isPanelHidden ? null : (
    <Nav.Item className={cx(styles.tabWrapper, { [styles.active]: active })}>
      {/* added `target="_self"` due to stopPropogation on onCloseStaticPanel
       * without it, the default behavior of the ancher tag (Nav.Link) is triggered
       * and a new tab is opened
       */}
      <Nav.Link
        {...props}
        className={styles.tabHeader}
        target="_self"
        eventKey={eventKey}
      >
        {children}
      </Nav.Link>
      <div className={styles.tabDivider} />
    </Nav.Item>
  );
};

const Tabs: React.FC = () => {
  const { flagOn } = useFlags();
  const dispatch = useDispatch();
  const activeKey = useSelector(selectSidebarActiveTabKey);
  const panels = useSelector(selectSidebarPanels);
  const forms = useSelector(selectSidebarForms);
  const temporaryPanels = useSelector(selectSidebarTemporaryPanels);
  const modActivationPanel = useSelector(selectSidebarModActivationPanel);
  const staticPanels = useSelector(selectSidebarStaticPanels);
  const getExtensionFromEventKey = useSelector(selectExtensionFromEventKey);
  const visiblePanelCount = useSelector(selectVisiblePanelCount);
  const closedTabs = useSelector(selectClosedTabs);
  const hasModLauncherEnabled = flagOn("sidebar-home-tab");

  const onSelect = (eventKey: string) => {
    reportEvent(Events.VIEW_SIDE_BAR_PANEL, {
      ...selectEventData(getExtensionFromEventKey(eventKey)),
      initialLoad: false,
      source: "tabClick",
    });
    dispatch(sidebarSlice.actions.selectTab(eventKey));
  };

  const onOpenModLauncher = () => {
    const modLauncherEventKey = eventKeyForEntry(MOD_LAUNCHER);
    const isModLauncherOpen =
      // eslint-disable-next-line security/detect-object-injection -- modLauncherEventKey is not user input
      !closedTabs[modLauncherEventKey];

    reportEvent(Events.VIEW_SIDE_BAR_PANEL, {
      ...selectEventData(getExtensionFromEventKey(modLauncherEventKey)),
      initialLoad: false,
      source: "modLauncer open button",
    });

    if (!isModLauncherOpen) {
      dispatch(sidebarSlice.actions.openTab(modLauncherEventKey));
    }

    dispatch(sidebarSlice.actions.selectTab(modLauncherEventKey));
  };

  const onClosePanel = async (
    event: MouseEvent<HTMLButtonElement>,
    panel: SidebarEntry
  ) => {
    // Without stopPropagation, the onSelect handler will be called and the panel will be reopened
    event.stopPropagation();

    if (isTemporaryPanelEntry(panel)) {
      dispatch(sidebarSlice.actions.removeTemporaryPanel(panel.nonce));
    } else if (isFormPanelEntry(panel)) {
      const frame = await getTopLevelFrame();
      cancelForm(frame, panel.nonce);
    } else {
      dispatch(sidebarSlice.actions.closeTab(eventKeyForEntry(panel)));
    }
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

  useAsyncEffect(
    async (isMounted) => {
      if (isMounted && visiblePanelCount === 0) {
        const topLevelFrame = await getTopLevelFrame();
        void hideSidebar(topLevelFrame);
      }
    },
    [visiblePanelCount]
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
          {panels.map((panel) => (
            <TabWithDivider
              key={panel.extensionId}
              active={isPanelActive(panel)}
              eventKey={eventKeyForEntry(panel)}
            >
              <span className={styles.tabTitle}>
                {panel.heading ?? <FontAwesomeIcon icon={faSpinner} />}
              </span>
              {hasModLauncherEnabled && (
                <CloseButton
                  onClick={async (event) => onClosePanel(event, panel)}
                />
              )}
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
              <CloseButton
                onClick={async (event) => onClosePanel(event, form)}
              />
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
                onClick={async (event) => onClosePanel(event, panel)}
              />
            </TabWithDivider>
          ))}

          {modActivationPanel && (
            <TabWithDivider
              // Use eventKeyForEntry which generates a string key
              key={eventKeyForEntry(modActivationPanel)}
              active={isPanelActive(modActivationPanel)}
              eventKey={eventKeyForEntry(modActivationPanel)}
            >
              <span className={styles.tabTitle}>
                {modActivationPanel.heading}
              </span>
            </TabWithDivider>
          )}

          {staticPanels.map((staticPanel) => (
            <TabWithDivider
              key={staticPanel.key}
              active={isPanelActive(staticPanel)}
              eventKey={eventKeyForEntry(staticPanel)}
            >
              <span className={styles.tabTitle}>{staticPanel.heading}</span>
              <CloseButton
                onClick={async (event) => onClosePanel(event, staticPanel)}
              />
            </TabWithDivider>
          ))}

          {hasModLauncherEnabled && (
            <Button
              size="sm"
              variant="link"
              className={styles.addButton}
              aria-label="open mod launcher"
              onClick={onOpenModLauncher}
            >
              <FontAwesomeIcon icon={faPlus} />
            </Button>
          )}
        </Nav>
        <Tab.Content className="p-0 border-0 full-height bg-white">
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

          {modActivationPanel && (
            <Tab.Pane
              className={cx("h-100", styles.paneOverrides)}
              key={eventKeyForEntry(modActivationPanel)}
              eventKey={eventKeyForEntry(modActivationPanel)}
            >
              <ErrorBoundary
                onError={() => {
                  reportEvent(Events.VIEW_ERROR, {
                    panelType: "activate",
                    // For backward compatability, provide a single modId to the recipeToActivate property
                    recipeToActivate: modActivationPanel.modIds[0],
                    modCount: modActivationPanel.modIds.length,
                    modIds: modActivationPanel.modIds,
                  });
                }}
              >
                {modActivationPanel.modIds.length === 1 ? (
                  <ActivateModPanel modId={modActivationPanel.modIds[0]} />
                ) : (
                  <ActivateMultipleModsPanel
                    modIds={modActivationPanel.modIds}
                  />
                )}
              </ErrorBoundary>
            </Tab.Pane>
          )}

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
        </Tab.Content>
      </div>
    </Tab.Container>
  );
};

export default Tabs;
