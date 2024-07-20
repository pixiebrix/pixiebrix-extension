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
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import DataTabPane, {
  developerOnlyTabAlertElement,
} from "@/pageEditor/tabs/editTab/dataPanel/DataTabPane";
import DataTabJsonTree from "@/pageEditor/tabs/editTab/dataPanel/DataTabJsonTree";
import { useSelector } from "react-redux";
import { selectActiveNodeInfo } from "@/pageEditor/store/editor/editorSelectors";

/**
 * Developer-only data panel tab for viewing the underlying brick configuration JSON. Used to debug brick configuration
 * UI/functionality problems.
 *
 * @see ModComponentFormStateTab
 */
const BrickConfigFormStateTab: React.FC = () => {
  const { blockConfig: brickConfig } = useSelector(selectActiveNodeInfo);

  return (
    <DataTabPane eventKey={DataPanelTabKey.BrickConfigFormState}>
      {developerOnlyTabAlertElement}
      <DataTabJsonTree
        data={brickConfig}
        tabKey={DataPanelTabKey.BrickConfigFormState}
        label="Brick Config Form State"
      />
    </DataTabPane>
  );
};

export default BrickConfigFormStateTab;
