/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { type UnknownObject } from "@/types/objectTypes";
import { isEmpty } from "lodash";
import { type UnknownRecord } from "type-fest/source/internal";
import { popoverTheme } from "@/components/fields/schemaFields/widgets/varPopup/popoverTheme";
import { expandCurrentVariableLevel } from "@/components/fields/schemaFields/widgets/varPopup/menuFilters";
import {
  ALLOW_ANY_CHILD,
  IS_ARRAY,
} from "@/analysis/analysisVisitors/varAnalysis/varMap";
import useTreeRow from "@/components/fields/schemaFields/widgets/varPopup/useTreeRow";

function isObjectLike(value: unknown): boolean {
  if (typeof value !== "object" || value == null) {
    return false;
  }

  const varMapEntry = value as UnknownRecord;

  // eslint-disable-next-line security/detect-object-injection -- Symbols
  if (varMapEntry[IS_ARRAY] || varMapEntry[ALLOW_ANY_CHILD]) {
    return true;
  }

  // XXX: this might mis=categorize empty objects in the trace :shrug:
  if (Object.keys(value).length === 0) {
    return false;
  }
}

function compareObjectKeys(
  lhsKey: string,
  rhsKey: string,
  obj: UnknownObject
): number {
  // eslint-disable-next-line security/detect-object-injection -- from Object.fromEntries
  const lhsValue = obj[lhsKey];
  // eslint-disable-next-line security/detect-object-injection -- from Object.fromEntries
  const rhsValue = obj[rhsKey];

  if (isObjectLike(lhsValue)) {
    if (isObjectLike(rhsValue)) {
      // Alphabetize object
      return lhsKey.localeCompare(rhsKey);
    }

    // Primitive rhsValue should appear before object/array lhsValue
    return 1;
  }

  // Primitive lhsValue should appear before object/array rhsValue
  if (isObjectLike(rhsValue)) {
    return -1;
  }

  return lhsKey.localeCompare(rhsKey);
}

/**
 * Sorts object keys in an alphabetic order, primitive values (string, boolean) should come before nested
 * Arrays and Objects.
 */
function sortObjectKeys(value: unknown): unknown {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value).sort(([lhsKey], [rhsKey]) =>
        compareObjectKeys(lhsKey, rhsKey, value as UnknownObject)
      )
    );
  }

  return value;
}

// JSONTree defaultItemString
const defaultItemString: GetItemString = (type, data, itemType, itemString) => (
  <span>
    {itemType} {itemString}
  </span>
);

const getItemString: GetItemString = (type, data, itemType, itemString) => {
  if (type === "Object" && isEmpty(data)) {
    // Corresponds to entries where not trace value exists
    return null;
  }

  return defaultItemString(type, data, itemType, itemString, null);
};

const NodeLabel: React.FunctionComponent<{
  path: KeyPath;
  onSelect: (path: string[]) => void;
}> = ({ path, onSelect }) => {
  const buttonRef = useRef<HTMLElement>(null);

  const select = () => {
    onSelect(path.map(String).reverse());
  };

  // Provide highlighting/click handler to the node's row
  useTreeRow(buttonRef, select);

  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    select();
  };

  return (
    // Use native button to avoid extra bootstrap variant styling
    <button
      type="button"
      className="btn"
      onClick={onClick}
      ref={(element) => {
        buttonRef.current = element;
      }}
    >
      {path[0]}
    </button>
  );
};

const VariablesTree: React.FunctionComponent<{
  vars: UnknownRecord;
  onVarSelect: (selectedPath: string[]) => void;
  likelyVariable: string;
}> = ({ vars, onVarSelect, likelyVariable }) => (
  <JSONTree
    key={likelyVariable}
    data={vars}
    theme={popoverTheme}
    postprocessValue={sortObjectKeys}
    shouldExpandNodeInitially={expandCurrentVariableLevel(vars, likelyVariable)}
    invertTheme
    hideRoot
    labelRenderer={(relativePath) => (
      <NodeLabel path={relativePath} onSelect={onVarSelect} />
    )}
    getItemString={getItemString}
  />
);

export default VariablesTree;
