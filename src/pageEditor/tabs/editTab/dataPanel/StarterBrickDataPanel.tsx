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
import { useSelector } from "react-redux";
import { Nav, Tab } from "react-bootstrap";
import useDataPanelActiveTabKey from "@/pageEditor/tabs/editTab/dataPanel/useDataPanelActiveTabKey";
import useFlags from "@/hooks/useFlags";
import ModVariablesTab from "./tabs/ModVariablesTab";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import ModComponentFormStateTab from "./tabs/ModComponentFormStateTab";
import NodeFormStateTab from "./tabs/NodeFormStateTab";
import { selectActiveModComponentFormState } from "@/pageEditor/store/editor/editorSelectors";
import { assertNotNullish } from "@/utils/nullishUtils";
import { NavItem } from "@/pageEditor/tabs/editTab/dataPanel/BrickDataPanel";
import StarterBrickInputTab from "@/pageEditor/tabs/editTab/dataPanel/tabs/StarterBrickInputTab";
import StarterBrickOutputTab from "@/pageEditor/tabs/editTab/dataPanel/tabs/StarterBrickOutputTab";
import { FeatureFlags } from "@/auth/featureFlags";
import FindTab from "@/pageEditor/tabs/editTab/dataPanel/tabs/FindTab";

/**
 * @see DataPanel
 */
const StarterBrickDataPanel: React.FC = () => {
  const { flagOn } = useFlags();
  const showDeveloperTabs = flagOn(FeatureFlags.PAGE_EDITOR_DEVELOPER);

  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );

  assertNotNullish(
    activeModComponentFormState,
    "Starter Brick Data Panel can only be used in a mod component editor context",
  );

  const { starterBrick } = activeModComponentFormState;

  const [activeTabKey, onSelectTab] = useDataPanelActiveTabKey(
    DataPanelTabKey.Output,
  );

  return (
    <Tab.Container activeKey={activeTabKey} onSelect={onSelectTab}>
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
        <NavItem eventKey={DataPanelTabKey.Input} label="Input" />

        <NavItem eventKey={DataPanelTabKey.Output} label="Output" />

        <NavItem
          eventKey={DataPanelTabKey.ModVariables}
          label="Mod Variables"
        />

        {flagOn(FeatureFlags.PAGE_EDITOR_FIND) && (
          <NavItem eventKey={DataPanelTabKey.Find} label="Search" />
        )}
      </Nav>
      <Tab.Content>
        {showDeveloperTabs && (
          <>
            <ModComponentFormStateTab />
            <NodeFormStateTab config={starterBrick} />
          </>
        )}

        <StarterBrickInputTab />

        <StarterBrickOutputTab />

        <ModVariablesTab />

        {flagOn(FeatureFlags.PAGE_EDITOR_FIND) && <FindTab />}
      </Tab.Content>
    </Tab.Container>
  );
};

export default StarterBrickDataPanel;
