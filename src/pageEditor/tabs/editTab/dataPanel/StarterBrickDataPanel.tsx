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
import { makeSelectBrickTrace } from "@/pageEditor/store/runtime/runtimeSelectors";
import { Nav, Tab } from "react-bootstrap";
import dataPanelStyles from "@/pageEditor/tabs/dataPanelTabs.module.scss";
import StarterBrickPreview from "@/pageEditor/tabs/effect/StarterBrickPreview";
import useDataPanelActiveTabKey from "@/pageEditor/tabs/editTab/dataPanel/useDataPanelActiveTabKey";
import useFlags from "@/hooks/useFlags";
import ModVariablesTab from "./tabs/ModVariablesTab";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import DataTabJsonTree from "./DataTabJsonTree";
import ModComponentFormStateTab from "./tabs/ModComponentFormStateTab";
import BrickConfigFormStateTab from "./tabs/BrickConfigFormStateTab";
import { selectActiveModComponentFormState } from "@/pageEditor/store/editor/editorSelectors";
import { assertNotNullish } from "@/utils/nullishUtils";

const StarterBrickDataPanel: React.FC = () => {
  const { flagOn } = useFlags();
  const showDeveloperTabs = flagOn("page-editor-developer");

  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );
  assertNotNullish(
    activeModComponentFormState,
    "StarterBrickDataPanel cannot be rendered without an activeModComponentFormState",
  );

  const {
    modComponent: { brickPipeline },
    starterBrick,
  } = activeModComponentFormState;
  const firstBrickInstanceId = brickPipeline[0]?.instanceId;

  const { record: firstBrickTraceRecord } = useSelector(
    makeSelectBrickTrace(firstBrickInstanceId),
  );

  const [activeTabKey, onSelectTab] = useDataPanelActiveTabKey(
    firstBrickTraceRecord ? DataPanelTabKey.Output : DataPanelTabKey.Preview,
  );

  return (
    <Tab.Container activeKey={activeTabKey} onSelect={onSelectTab}>
      <Nav variant="tabs">
        {showDeveloperTabs && (
          <>
            <Nav.Item className={dataPanelStyles.tabNav}>
              <Nav.Link eventKey={DataPanelTabKey.ModComponentFormState}>
                Mod Component State
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className={dataPanelStyles.tabNav}>
              <Nav.Link eventKey={DataPanelTabKey.BrickConfigFormState}>
                Brick Config State
              </Nav.Link>
            </Nav.Item>
          </>
        )}
        <Nav.Item className={dataPanelStyles.tabNav}>
          <Nav.Link eventKey={DataPanelTabKey.Input}>Input</Nav.Link>
        </Nav.Item>
        <Nav.Item className={dataPanelStyles.tabNav}>
          <Nav.Link eventKey={DataPanelTabKey.Output}>Output</Nav.Link>
        </Nav.Item>
        <Nav.Item className={dataPanelStyles.tabNav}>
          <Nav.Link eventKey={DataPanelTabKey.Preview}>Preview</Nav.Link>
        </Nav.Item>
        <Nav.Item className={dataPanelStyles.tabNav}>
          <Nav.Link eventKey={DataPanelTabKey.ModVariables}>
            Mod Variables
          </Nav.Link>
        </Nav.Item>
      </Nav>
      <Tab.Content>
        <Tab.Pane
          eventKey={DataPanelTabKey.Input}
          className={dataPanelStyles.tabPane}
        >
          <div className="text-muted">Starter Bricks do not receive input.</div>
        </Tab.Pane>
        {showDeveloperTabs && (
          <>
            <ModComponentFormStateTab />
            <BrickConfigFormStateTab config={starterBrick} />
          </>
        )}
        <Tab.Pane
          eventKey={DataPanelTabKey.Output}
          className={dataPanelStyles.tabPane}
          mountOnEnter
          unmountOnExit
        >
          {firstBrickTraceRecord ? (
            <DataTabJsonTree
              data={firstBrickTraceRecord.templateContext}
              copyable
              searchable
              tabKey={DataPanelTabKey.Output}
              label="Output Data"
            />
          ) : (
            <div className="text-muted">
              Add a brick and run the mod to view Starter Brick output.
            </div>
          )}
        </Tab.Pane>
        <Tab.Pane
          eventKey={DataPanelTabKey.Preview}
          className={dataPanelStyles.tabPane}
          mountOnEnter
          unmountOnExit
        >
          <StarterBrickPreview />
        </Tab.Pane>
        <ModVariablesTab />
      </Tab.Content>
    </Tab.Container>
  );
};

export default StarterBrickDataPanel;
