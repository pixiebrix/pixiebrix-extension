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

import React, { useRef } from "react";
import { type GetItemString, JSONTree, type KeyPath } from "react-json-tree";
import { isEmpty } from "lodash";
import { type UnknownRecord } from "type-fest";
import { popoverTheme } from "./popoverTheme";
import {
  expandCurrentVariableLevel,
  sortVarMapKeys,
} from "./menuFilters";
import useTreeRow from "./useTreeRow";
import deepEquals from "fast-deep-equal";

// JSONTree defaultItemString
const defaultItemString: GetItemString = (type, data, itemType, itemString) => (
  <span>
    {itemType} {itemString}
  </span>
);

const getItemString: GetItemString = (type, data, itemType, itemString) => {
  if (type === "Object" && isEmpty(data)) {
    // Corresponds to entries where the trace value does not exist
    return null;
  }

  return defaultItemString(type, data, itemType, itemString, []);
};

const NodeLabel: React.FunctionComponent<{
  /**
   * True if the node is the currently active node in the tree.
   */
  isActive: boolean;
  /**
   * The path to the node in the tree.
   */
  path: KeyPath;
  /**
   * Selection callback.
   * @param path the path in the varMap in order, e.g., ["@input", "foo"]
   */
  onSelect: (path: string[]) => void;
}> = ({ isActive, path, onSelect }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const select = () => {
    // JSONTree tracks key path in reverse order
    onSelect(path.map(String).reverse());
  };

  // Provide highlighting/click handler to the node's row
  useTreeRow({ buttonRef, onSelect: select, isActive });

  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    select();
  };

  return (
    // Use native button to avoid extra bootstrap variant styling
    <button type="button" className="btn" onClick={onClick} ref={buttonRef}>
      {path[0]}
    </button>
  );
};

const VariablesTree: React.FunctionComponent<{
  vars: UnknownRecord;
  onVarSelect: (selectedPath: string[]) => void;
  likelyVariable: string | null;
  activeKeyPath: KeyPath | null;
}> = ({ vars, onVarSelect, likelyVariable, activeKeyPath }) => (
  <JSONTree
    key={likelyVariable}
    data={vars}
    theme={popoverTheme}
    postprocessValue={sortVarMapKeys}
    shouldExpandNodeInitially={expandCurrentVariableLevel(vars, likelyVariable)}
    hideRoot
    labelRenderer={(relativePath) => (
      <NodeLabel
        path={relativePath}
        onSelect={onVarSelect}
        isActive={deepEquals(activeKeyPath, relativePath)}
      />
    )}
    getItemString={getItemString}
  />
);

export default VariablesTree;
