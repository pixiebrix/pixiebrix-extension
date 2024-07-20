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

import React, { useEffect } from "react";
import { Nav, Tab } from "react-bootstrap";
import dataPanelStyles from "@/pageEditor/tabs/dataPanelTabs.module.scss";
import { useSelector } from "react-redux";
import useDataPanelActiveTabKey from "@/pageEditor/tabs/editTab/dataPanel/useDataPanelActiveTabKey";
import useFlags from "@/hooks/useFlags";
import ModVariablesTab from "./tabs/ModVariablesTab";
import { DataPanelTabKey } from "./dataPanelTypes";
import {
  selectActiveNodeEventData,
  selectActiveNodeInfo,
} from "@/pageEditor/store/editor/editorSelectors";
import ModComponentFormStateTab from "./tabs/ModComponentFormStateTab";
import BrickConfigFormStateTab from "./tabs/BrickConfigFormStateTab";
import CommentsTab from "@/pageEditor/tabs/editTab/dataPanel/tabs/CommentsTab";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import InputTab from "@/pageEditor/tabs/editTab/dataPanel/tabs/InputTab";
import OutputTab from "@/pageEditor/tabs/editTab/dataPanel/tabs/OutputTab";
import DesignTab, {
  shouldShowDocumentDesign,
  shouldShowFormDesign,
} from "@/pageEditor/tabs/editTab/dataPanel/tabs/DesignTab";
import OutlineTab from "@/pageEditor/tabs/editTab/dataPanel/tabs/OutlineTab";

const NavItem: React.FC<{ eventKey: DataPanelTabKey; label: string }> = ({
  eventKey,
  label,
}) => (
  <Nav.Item className={dataPanelStyles.tabNav}>
    <Nav.Link eventKey={eventKey}>{label}</Nav.Link>
  </Nav.Item>
);

/**
 * The Page Editor Data Panel
 * @since 2.0.6 refactored to only include logic for which tabs to show
 */
const DataPanel: React.FC = () => {
  const { flagOn } = useFlags();
  const showDeveloperTabs = flagOn("page-editor-developer");

  const { blockId: brickId } = useSelector(selectActiveNodeInfo);

  const eventData = useSelector(selectActiveNodeEventData);

  const showFormDesign = shouldShowFormDesign(brickId);
  const showDocumentDesign = shouldShowDocumentDesign(brickId);
  const showDesign = showFormDesign || showDocumentDesign;

  const [activeTabKey, onSelectTab] = useDataPanelActiveTabKey(
    showFormDesign || showDocumentDesign
      ? DataPanelTabKey.Design
      : DataPanelTabKey.Output,
  );

  useEffect(() => {
    reportEvent(Events.DATA_PANEL_TAB_VIEW, {
      ...eventData,
      tabName: activeTabKey,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- We only want to report when `activeTabKey` changes
  }, [activeTabKey]);

  return (
    <Tab.Container activeKey={activeTabKey} onSelect={onSelectTab}>
      <div>
        <Nav variant="tabs">
          <NavItem eventKey={DataPanelTabKey.Input} label="Input" />
          <NavItem
            eventKey={DataPanelTabKey.ModVariables}
            label="Mod Variables"
          />

          {showDeveloperTabs && (
            <>
              <NavItem
                eventKey={DataPanelTabKey.ModComponentFormState}
                label="Mod Component State"
              />
              <NavItem
                eventKey={DataPanelTabKey.BrickConfigFormState}
                label="Brick Config State"
              />
            </>
          )}

          <NavItem eventKey={DataPanelTabKey.Output} label="Output" />

          {showDesign && (
            <NavItem eventKey={DataPanelTabKey.Design} label="Design" />
          )}

          {showDocumentDesign && (
            <NavItem eventKey={DataPanelTabKey.Outline} label="Outline" />
          )}

          <NavItem eventKey={DataPanelTabKey.Comments} label="Comments" />
        </Nav>
        <Tab.Content className={dataPanelStyles.tabContent}>
          {showDeveloperTabs && (
            <>
              <ModComponentFormStateTab />
              <BrickConfigFormStateTab />
            </>
          )}

          <InputTab />

          <OutputTab />

          <ModVariablesTab />

          {showDesign && <DesignTab />}

          {showDocumentDesign && <OutlineTab />}

          <CommentsTab />
        </Tab.Content>
      </div>
    </Tab.Container>
  );
};

export default DataPanel;
