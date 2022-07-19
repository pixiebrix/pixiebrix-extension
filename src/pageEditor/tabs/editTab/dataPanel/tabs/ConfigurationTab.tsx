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

import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import DataTab from "@/pageEditor/tabs/editTab/dataPanel/DataTab";
import DataTabJsonTree from "@/pageEditor/tabs/editTab/dataPanel/DataTabJsonTree";

const ConfigurationTab: React.FC<{ config: unknown }> = ({ config }) => (
  <DataTab eventKey={DataPanelTabKey.BlockConfig}>
    <div className="text-info">
      <FontAwesomeIcon icon={faInfoCircle} /> This tab is only visible to
      developers
    </div>
    <DataTabJsonTree
      data={config ?? {}}
      tabKey={DataPanelTabKey.BlockConfig}
      label="Configuration"
    />
  </DataTab>
);

export default ConfigurationTab;
