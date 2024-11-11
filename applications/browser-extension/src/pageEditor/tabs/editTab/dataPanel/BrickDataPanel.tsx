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

import React, { useEffect, useRef } from "react";
import { Nav, Tab } from "react-bootstrap";
import dataPanelStyles from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTabs.module.scss";
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
import NodeFormStateTab from "./tabs/NodeFormStateTab";
import CommentsTab from "@/pageEditor/tabs/editTab/dataPanel/tabs/CommentsTab";
import FindTab from "@/pageEditor/tabs/editTab/dataPanel/tabs/FindTab/FindTab";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import BrickInputTab from "@/pageEditor/tabs/editTab/dataPanel/tabs/BrickInputTab";
import BrickOutputTab from "@/pageEditor/tabs/editTab/dataPanel/tabs/BrickOutputTab";
import DesignTab, {
  shouldShowDocumentDesign,
  shouldShowFormDesign,
} from "@/pageEditor/tabs/editTab/dataPanel/tabs/DesignTab";
import OutlineTab from "@/pageEditor/tabs/editTab/dataPanel/tabs/OutlineTab";
import { FeatureFlags } from "@/auth/featureFlags";

export const NavItem: React.FC<{
  eventKey: DataPanelTabKey;
  label: string;
}> = ({ eventKey, label }) => (
  <Nav.Item className={dataPanelStyles.tabNav}>
    <Nav.Link eventKey={eventKey}>{label}</Nav.Link>
  </Nav.Item>
);

/**
 * The Page Editor Data Panel
 * @since 2.0.7 refactored to only include logic for which tabs to show
 * @see StarterBrickDataPanel
 */
const BrickDataPanel: React.FC = () => {
  const { flagOn } = useFlags();
  const showDeveloperTabs = flagOn(FeatureFlags.PAGE_EDITOR_DEVELOPER);

  const { blockId: brickId, blockConfig: brickConfig } =
    useSelector(selectActiveNodeInfo);

  const eventData = useSelector(selectActiveNodeEventData);

  const showFormDesign = shouldShowFormDesign(brickId);
  const showDocumentDesign = shouldShowDocumentDesign(brickId);
  const showDesign = showFormDesign || showDocumentDesign;

  const contentBoundaryRef = useRef<HTMLElement | null>(null);

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
          {showDeveloperTabs && (
            <>
              <NavItem
                eventKey={DataPanelTabKey.ModComponentFormState}
                label="Mod Component State"
              />
              <NavItem
                eventKey={DataPanelTabKey.NodeFormState}
                label="Node State"
              />
            </>
          )}

          {showDesign && (
            <NavItem eventKey={DataPanelTabKey.Design} label="Design" />
          )}

          {showDocumentDesign && (
            <NavItem eventKey={DataPanelTabKey.Outline} label="Outline" />
          )}

          <NavItem eventKey={DataPanelTabKey.Input} label="Input" />

          <NavItem eventKey={DataPanelTabKey.Output} label="Output" />

          <NavItem
            eventKey={DataPanelTabKey.ModVariables}
            label="Mod Variables"
          />

          <NavItem eventKey={DataPanelTabKey.Comments} label="Comments" />

          {flagOn(FeatureFlags.PAGE_EDITOR_FIND) && (
            <NavItem eventKey={DataPanelTabKey.Find} label="Find" />
          )}
        </Nav>
        <Tab.Content
          className={dataPanelStyles.tabContent}
          ref={(element: HTMLDivElement) => {
            contentBoundaryRef.current = element;
          }}
        >
          {showDeveloperTabs && (
            <>
              <ModComponentFormStateTab />
              <NodeFormStateTab config={brickConfig} />
            </>
          )}

          <BrickInputTab />

          <BrickOutputTab />

          <ModVariablesTab />

          {showDesign && <DesignTab boundingBoxRef={contentBoundaryRef} />}

          {showDocumentDesign && <OutlineTab />}

          <CommentsTab />

          {flagOn(FeatureFlags.PAGE_EDITOR_FIND) && <FindTab />}
        </Tab.Content>
      </div>
    </Tab.Container>
  );
};

export default BrickDataPanel;
