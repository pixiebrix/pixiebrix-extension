/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { UUID } from "@/core";
import { useSelector } from "react-redux";
import { makeSelectBlockTrace } from "@/pageEditor/slices/runtimeSelectors";
import { Nav, Tab } from "react-bootstrap";
import dataPanelStyles from "@/pageEditor/tabs/dataPanelTabs.module.scss";
import ExtensionPointPreview from "@/pageEditor/tabs/effect/ExtensionPointPreview";
import useDataPanelActiveTabKey from "@/pageEditor/tabs/editTab/dataPanel/useDataPanelActiveTabKey";
import useFlags from "@/hooks/useFlags";
import PageStateTab from "./tabs/PageStateTab";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import DataTabJsonTree from "./DataTabJsonTree";
import StateTab from "./tabs/StateTab";
import ConfigurationTab from "./tabs/ConfigurationTab";
import { selectActiveElement } from "@/pageEditor/slices/editorSelectors";

const FoundationDataPanel: React.FC<{
  firstBlockInstanceId?: UUID;
}> = ({ firstBlockInstanceId }) => {
  const { flagOn } = useFlags();
  const showDeveloperTabs = flagOn("page-editor-developer");

  const activeElement = useSelector(selectActiveElement);
  const { extensionPoint } = activeElement;

  const { record: firstBlockTraceRecord } = useSelector(
    makeSelectBlockTrace(firstBlockInstanceId)
  );

  const [activeTabKey, onSelectTab] = useDataPanelActiveTabKey(
    firstBlockTraceRecord ? DataPanelTabKey.Output : DataPanelTabKey.Preview
  );

  return (
    <Tab.Container activeKey={activeTabKey} onSelect={onSelectTab}>
      <Nav variant="tabs">
        <Nav.Item className={dataPanelStyles.tabNav}>
          <Nav.Link eventKey={DataPanelTabKey.Context}>Context</Nav.Link>
        </Nav.Item>
        {showDeveloperTabs && (
          <>
            <Nav.Item className={dataPanelStyles.tabNav}>
              <Nav.Link eventKey={DataPanelTabKey.State}>State</Nav.Link>
            </Nav.Item>
            <Nav.Item className={dataPanelStyles.tabNav}>
              <Nav.Link eventKey={DataPanelTabKey.BlockConfig}>
                Raw Foundation
              </Nav.Link>
            </Nav.Item>
          </>
        )}
        <Nav.Item className={dataPanelStyles.tabNav}>
          <Nav.Link eventKey={DataPanelTabKey.Rendered}>Rendered</Nav.Link>
        </Nav.Item>
        <Nav.Item className={dataPanelStyles.tabNav}>
          <Nav.Link eventKey={DataPanelTabKey.Output}>Output</Nav.Link>
        </Nav.Item>
        <Nav.Item className={dataPanelStyles.tabNav}>
          <Nav.Link eventKey={DataPanelTabKey.Preview}>Preview</Nav.Link>
        </Nav.Item>
        <Nav.Item className={dataPanelStyles.tabNav}>
          <Nav.Link eventKey={DataPanelTabKey.PageState}>Page State</Nav.Link>
        </Nav.Item>
      </Nav>
      <Tab.Content>
        <Tab.Pane
          eventKey={DataPanelTabKey.Context}
          className={dataPanelStyles.tabPane}
        >
          <div className="text-muted">
            A foundation is the first step in the execution flow, they do not
            receive inputs
          </div>
        </Tab.Pane>
        {showDeveloperTabs && (
          <>
            <StateTab />
            <ConfigurationTab config={extensionPoint} />
          </>
        )}
        <Tab.Pane
          eventKey={DataPanelTabKey.Rendered}
          className={dataPanelStyles.tabPane}
        >
          <div className="text-muted">
            A foundation is the first step in the execution flow, they do not
            receive inputs
          </div>
        </Tab.Pane>
        <Tab.Pane
          eventKey={DataPanelTabKey.Output}
          className={dataPanelStyles.tabPane}
          mountOnEnter
          unmountOnExit
        >
          {firstBlockTraceRecord ? (
            <DataTabJsonTree
              data={firstBlockTraceRecord.templateContext}
              copyable
              searchable
              tabKey={DataPanelTabKey.Output}
              label="Output Data"
            />
          ) : (
            <div className="text-muted">
              No trace available, add a brick and run the extension to see the
              data produced by the foundation
            </div>
          )}
        </Tab.Pane>
        <Tab.Pane
          eventKey={DataPanelTabKey.Preview}
          className={dataPanelStyles.tabPane}
          mountOnEnter
          unmountOnExit
        >
          <ExtensionPointPreview element={activeElement} />
        </Tab.Pane>
        <PageStateTab />
      </Tab.Content>
    </Tab.Container>
  );
};

export default FoundationDataPanel;
