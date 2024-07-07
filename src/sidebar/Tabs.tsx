/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import React, { lazy, type MouseEvent, Suspense } from "react";
import {
  isFormPanelEntry,
  isModActivationPanelEntry,
  isTemporaryPanelEntry,
  type PanelEntry,
  type SidebarEntry,
} from "@/types/sidebarTypes";
import { eventKeyForEntry } from "@/store/sidebar/eventKeyUtils";
import { getBodyForStaticPanel } from "./staticPanelUtils";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import {
  Button,
  CloseButton,
  Nav,
  type NavLinkProps,
  Tab,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSpinner } from "@fortawesome/free-solid-svg-icons";
import PanelBody from "@/sidebar/PanelBody";
import FormBody from "@/sidebar/FormBody";
import styles from "./Tabs.module.scss";
import cx from "classnames";
import { BusinessError } from "@/errors/businessErrors";
import { useDispatch, useSelector } from "react-redux";
import {
  selectClosedTabs,
  selectExtensionFromEventKey,
  selectSidebarActiveTabKey,
  selectSidebarForms,
  selectSidebarModActivationPanel,
  selectSidebarPanels,
  selectSidebarStaticPanels,
  selectSidebarTemporaryPanels,
} from "@/sidebar/sidebarSelectors";
import sidebarSlice from "@/store/sidebar/sidebarSlice";
import { selectEventData } from "@/telemetry/deployments";
import ErrorBoundary from "@/sidebar/SidebarErrorBoundary";
import { TemporaryPanelTabPane } from "./TemporaryPanelTabPane";
import { MOD_LAUNCHER } from "@/store/sidebar/constants";
import { useHideEmptySidebar } from "@/sidebar/useHideEmptySidebar";
import removeTemporaryPanel from "@/store/sidebar/thunks/removeTemporaryPanel";
import { type AsyncDispatch } from "@/sidebar/store";
import useOnMountOnly from "@/hooks/useOnMountOnly";
import UnavailableOverlay from "@/sidebar/UnavailableOverlay";
import removeFormPanel from "@/store/sidebar/thunks/removeFormPanel";
import ConnectingOverlay from "@/sidebar/ConnectingOverlay";
import { mapModComponentRefToEventData } from "@/telemetry/telemetryHelpers";

const ActivateModPanel = lazy(
  async () =>
    import(
      /* webpackChunkName: "ActivatePanels" */
      "@/sidebar/activateMod/ActivateModPanel"
    ),
);

const ActivateMultipleModsPanel = lazy(
  async () =>
    import(
      /* webpackChunkName: "ActivatePanels" */
      "@/sidebar/activateMod/ActivateMultipleModsPanel"
    ),
);

const permanentSidebarPanelAction = () => {
  throw new BusinessError("Action not supported for permanent sidebar panels");
};

/**
 * A tab that's conditionally rendered based on tab open/closed state.
 * @see selectClosedTabs
 */
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
    <Nav.Item
      className={cx(styles.tabWrapper, { [styles.active ?? ""]: active })}
    >
      <Nav.Link
        {...props}
        as="button"
        className={styles.tabHeader}
        eventKey={eventKey}
      >
        {children}
      </Nav.Link>
      <div className={styles.tabDivider} />
    </Nav.Item>
  );
};

const Tabs: React.FC = () => {
  const dispatch = useDispatch<AsyncDispatch>();
  const activeKey = useSelector(selectSidebarActiveTabKey);
  const panels = useSelector(selectSidebarPanels);
  const forms = useSelector(selectSidebarForms);
  const temporaryPanels = useSelector(selectSidebarTemporaryPanels);
  const modActivationPanel = useSelector(selectSidebarModActivationPanel);
  const staticPanels = useSelector(selectSidebarStaticPanels);
  const getExtensionFromEventKey = useSelector(selectExtensionFromEventKey);
  const closedTabs = useSelector(selectClosedTabs);

  const modLauncherEventKey = eventKeyForEntry(MOD_LAUNCHER);
  const isModLauncherOpen =
    // eslint-disable-next-line security/detect-object-injection -- modLauncherEventKey is not user input
    !closedTabs[modLauncherEventKey];

  const onSelect = (eventKey: string) => {
    // Automatically close the mod launcher if it's open, the + button will be shown instead
    if (isModLauncherOpen) {
      dispatch(sidebarSlice.actions.closeTab(modLauncherEventKey));
    }

    reportEvent(Events.VIEW_SIDEBAR_PANEL, {
      ...selectEventData(getExtensionFromEventKey(eventKey)),
      initialLoad: false,
      source: "tabClick",
    });
    dispatch(sidebarSlice.actions.selectTab(eventKey));
  };

  const onOpenModLauncher = () => {
    reportEvent(Events.VIEW_SIDEBAR_PANEL, {
      ...selectEventData(getExtensionFromEventKey(modLauncherEventKey)),
      initialLoad: false,
      source: "modLauncher open button",
    });

    if (!isModLauncherOpen) {
      dispatch(sidebarSlice.actions.openTab(modLauncherEventKey));
    }

    dispatch(sidebarSlice.actions.selectTab(modLauncherEventKey));
  };

  const onClosePanel = async (
    event: MouseEvent<HTMLButtonElement>,
    panel: SidebarEntry,
  ) => {
    // Default is to navigate to `#` hash which causes an error in the background page
    event.preventDefault();
    // Without stopPropagation, the onSelect handler will be called and the panel will be reopened
    event.stopPropagation();
    reportEvent(Events.SIDEBAR_TAB_CLOSE, { panel: JSON.stringify(panel) });
    if (isTemporaryPanelEntry(panel)) {
      await dispatch(removeTemporaryPanel(panel.nonce));
    } else if (isFormPanelEntry(panel)) {
      await dispatch(removeFormPanel(panel.nonce));
    } else if (isModActivationPanelEntry(panel)) {
      dispatch(sidebarSlice.actions.hideModActivationPanel());
    } else {
      dispatch(sidebarSlice.actions.closeTab(eventKeyForEntry(panel)));
    }
  };

  // Other views are handled by onSelect
  useOnMountOnly(() => {
    reportEvent(Events.VIEW_SIDEBAR_PANEL, {
      ...selectEventData(getExtensionFromEventKey(activeKey)),
      initialLoad: true,
    });
  });

  useHideEmptySidebar();

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
              key={panel.modComponentRef.extensionId}
              active={isPanelActive(panel)}
              eventKey={eventKeyForEntry(panel)}
            >
              <span className={styles.tabTitle}>
                {panel.heading ?? <FontAwesomeIcon icon={faSpinner} />}
              </span>
              <CloseButton
                onClick={async (event) => onClosePanel(event, panel)}
              />
            </TabWithDivider>
          ))}

          {forms.map((form) => (
            <TabWithDivider
              key={form.modComponentRef.extensionId}
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
              <CloseButton
                onClick={async (event) =>
                  onClosePanel(event, modActivationPanel)
                }
              />
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
          {!isModLauncherOpen && (
            <Button
              size="sm"
              variant="link"
              className={styles.addButton}
              aria-label="Open Mod Launcher"
              onClick={onOpenModLauncher}
            >
              <FontAwesomeIcon icon={faPlus} />
            </Button>
          )}
        </Nav>
        <Tab.Content
          className={cx(
            "p-0 border-0 full-height scrollable-area bg-white",
            styles.tabContainer,
          )}
        >
          {panels.map((panel: PanelEntry) => (
            <Tab.Pane
              // For memory performance, only mount the panel when the tab is 1) visible for the panel, the 2) the user
              // has opened the panel. The panel's header/payload will still be calculated in the sidebar starter brick,
              // but we'll save on memory footprint from any embedded content.
              // For context, see https://github.com/pixiebrix/pixiebrix-extension/issues/6801
              mountOnEnter={true}
              // Keep tab state, otherwise use will lose local state when a temporary panel/form is added, e.g.,
              // un-submitted form state/scroll position
              unmountOnExit={false}
              className={cx("full-height flex-grow", styles.paneOverrides)}
              key={panel.modComponentRef.extensionId}
              eventKey={eventKeyForEntry(panel)}
            >
              <ErrorBoundary
                onError={() => {
                  reportEvent(Events.VIEW_ERROR, {
                    ...mapModComponentRefToEventData(panel.modComponentRef),
                    panelType: panel.type,
                  });
                }}
              >
                {panel.isConnecting && <ConnectingOverlay />}
                {panel.isUnavailable && (
                  <UnavailableOverlay
                    onClose={async () =>
                      dispatch(
                        sidebarSlice.actions.closeTab(eventKeyForEntry(panel)),
                      )
                    }
                  />
                )}
                <PanelBody
                  isRootPanel
                  payload={panel.payload}
                  onAction={permanentSidebarPanelAction}
                  context={panel.modComponentRef}
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
                    ...mapModComponentRefToEventData(form.modComponentRef),
                    panelType: form.type,
                  });
                }}
              >
                {form.isUnavailable && (
                  <UnavailableOverlay
                    onClose={async () => dispatch(removeFormPanel(form.nonce))}
                  />
                )}
                <FormBody form={form} />
              </ErrorBoundary>
            </Tab.Pane>
          ))}

          {temporaryPanels.map((panel) => (
            <TemporaryPanelTabPane panel={panel} key={panel.nonce} />
          ))}

          {modActivationPanel && (
            <Tab.Pane
              mountOnEnter
              // Don't lose any state when switching away from the panel
              unmountOnExit={false}
              className={cx("h-100", styles.paneOverrides)}
              key={eventKeyForEntry(modActivationPanel)}
              eventKey={eventKeyForEntry(modActivationPanel)}
            >
              <Suspense
                // Just show blank to avoid a flash, because the module loading should be near instant
                fallback={<div></div>}
              >
                <ErrorBoundary
                  onError={() => {
                    reportEvent(Events.VIEW_ERROR, {
                      panelType: "activate",
                      // For backward compatability, provide a single modId to the recipeToActivate property
                      recipeToActivate: modActivationPanel.mods[0].modId,
                      modCount: modActivationPanel.mods.length,
                      modIds: modActivationPanel.mods.map((x) => x.modId),
                    });
                  }}
                >
                  {modActivationPanel.mods.length === 1 ? (
                    <ActivateModPanel mod={modActivationPanel.mods[0]} />
                  ) : (
                    <ActivateMultipleModsPanel mods={modActivationPanel.mods} />
                  )}
                </ErrorBoundary>
              </Suspense>
            </Tab.Pane>
          )}

          {staticPanels.map((staticPanel) => (
            <Tab.Pane
              // Avoid loading mod definitions into memory / fetching from marketplace until the tab is opened.
              // They can be quite large  for users with access to many mods
              mountOnEnter
              // Allow the user to quickly switch back to the panel
              unmountOnExit={false}
              className={cx("full-height", styles.paneOverrides)}
              key={staticPanel.key}
              eventKey={eventKeyForEntry(staticPanel)}
            >
              <Suspense
                // Just show blank to avoid a flash, because the module loading should be near instant
                fallback={<div></div>}
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
              </Suspense>
            </Tab.Pane>
          ))}
        </Tab.Content>
      </div>
    </Tab.Container>
  );
};

export default Tabs;
