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

import React from "react";
import { Tab, type TabPaneProps } from "react-bootstrap";
import dataPanelStyles from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTabs.module.scss";
import ErrorBoundary from "@/components/ErrorBoundary";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";

export const developerOnlyTabAlertElement = (
  <div className="text-info">
    <FontAwesomeIcon icon={faInfoCircle} /> This tab is only visible to
    developers
  </div>
);

/**
 * A Page Editor Data Tab Pane layout component
 * @since 2.0.6 the pane only contains the layout style/error boundary. Children are responsible for rendering
 * loading, stale, and error states
 */
const DataTabPane: React.FC<TabPaneProps> = ({ children, ...tabProps }) => (
  <Tab.Pane
    className={dataPanelStyles.tabPane}
    // Mount/unmount to ensure fresh data
    mountOnEnter
    unmountOnExit
    {...tabProps}
  >
    <ErrorBoundary>{children}</ErrorBoundary>
  </Tab.Pane>
);

export default DataTabPane;
