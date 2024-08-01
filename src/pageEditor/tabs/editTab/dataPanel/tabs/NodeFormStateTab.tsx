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
import DataTabPane from "@/pageEditor/tabs/editTab/dataPanel/DataTabPane";
import DataTabJsonTree from "@/pageEditor/tabs/editTab/dataPanel/DataTabJsonTree";

/**
 * Developer-only data panel tab for viewing the underlying brick configuration JSON.
 *
 * Used to debug brick and starter brick configuration UI/functionality problems.
 *
 * @param config the brick or starter brick configuration
 * @see ModComponentFormStateTab
 */
const NodeFormStateTab: React.FC<{ config: unknown }> = ({ config }) => (
  <DataTabPane eventKey={DataPanelTabKey.NodeFormState} isDeveloperOnly>
    <DataTabJsonTree
      data={config}
      tabKey={DataPanelTabKey.NodeFormState}
      label="Node Form State"
      searchable
    />
  </DataTabPane>
);

export default NodeFormStateTab;
