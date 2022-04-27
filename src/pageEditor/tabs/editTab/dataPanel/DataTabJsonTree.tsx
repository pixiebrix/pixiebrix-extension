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

import JsonTree, { JsonTreeProps } from "@/components/jsonTree/JsonTree";
import React from "react";
import { Except } from "type-fest";
import { DataPanelTabKey } from "./dataPanelTypes";
import useDataPanelTabState from "./useDataPanelTabState";

type DataTabJsonTreeProps = Except<
  JsonTreeProps,
  | "initialSearchQuery"
  | "onSearchQueryChange"
  | "initialExpandedState"
  | "onExpandedStateChange"
> & {
  tabKey: DataPanelTabKey;
};

const DataTabJsonTree: React.FunctionComponent<DataTabJsonTreeProps> = ({
  tabKey,
  ...jsonTreeProps
}) => {
  const state = useDataPanelTabState(tabKey);

  return (
    <JsonTree
      {...jsonTreeProps}
      initialSearchQuery={state.query}
      onSearchQueryChange={state.setQuery}
      // The state received from RTK store is immutable, unfreezing it
      initialExpandedState={state.treeExpandedState}
      onExpandedStateChange={(nextExpandedState) => {
        // Setting the state for the first time causes an error:
        // Cannot update a component (`SidebarExpanded`) while rendering a different component (`JSONNestedNode`).
        // If we skip the current cycle, React feels ok.
        setTimeout(() => {
          state.setTreeExpandedState(nextExpandedState);
        }, 50);
      }}
    />
  );
};

export default DataTabJsonTree;
