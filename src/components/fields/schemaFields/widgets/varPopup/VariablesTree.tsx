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

import React from "react";
import { type GetItemString, JSONTree, type KeyPath } from "react-json-tree";
import { jsonTreeTheme } from "@/themes/light";
import { type UnknownObject } from "@/types";
import { isEmpty } from "lodash";
import { type Theme } from "react-base16-styling";
import { UnknownRecord } from "type-fest/source/internal";

const theme = {
  extend: jsonTreeTheme,
  base0D: "#2e2441", // Label and arrow color
  arrowContainer: {
    padding: "4px",
    marginRight: "10px",
    backgroundColor: "#f0eff2",
    borderRadius: "2px",
  },
  arrow: {
    height: "12px",
    width: "12px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  // This aligns the arrow, label, and items string (N keys)
  nestedNode: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
  },
  // This makes the nested items to be rendered below the label
  nestedNodeChildren: {
    width: "100%",
  },
  value: {
    display: "flex",
    alignItems: "center",
    paddingLeft: "1.125em",
  },
  label: {
    wordBreak: "initial",
    textIndent: "-0.5em",
  },
  valueText: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textIndent: 0,
  },
} as Theme;

function sortObjectKeys(a: string, b: string, obj: UnknownObject): number {
  // eslint-disable-next-line security/detect-object-injection -- a and b are keys of obj received from Object.getOwnPropertyNames
  const valueA = obj[a];
  // eslint-disable-next-line security/detect-object-injection -- a and b are keys of obj received from Object.getOwnPropertyNames
  const valueB = obj[b];
  if (typeof valueA === "object") {
    if (typeof valueB === "object") {
      return a.localeCompare(b);
    }

    return 1;
  }

  if (typeof valueB === "object") {
    return -1;
  }

  return a.localeCompare(b);
}

// Sorting keys in an alphabetic order, plain values (string, boolean) should come before nested Arrays and Objects.
function postprocessValue(value: unknown): unknown {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value).sort(([a], [b]) =>
        sortObjectKeys(a, b, value as UnknownObject)
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
    return <span>not set</span>;
  }

  return defaultItemString(type, data, itemType, itemString, null);
};

type NodeLabelProps = {
  path: KeyPath;
  onSelect: (path: string[]) => void;
};

const NodeLabel: React.FunctionComponent<NodeLabelProps> = ({
  path,
  onSelect,
}) => {
  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    onSelect(path.map(String).reverse());
  };

  return (
    <button type="button" className="btn" onClick={onClick}>
      {path[0]}
    </button>
  );
};

type VariablesTreeProps = {
  vars: UnknownRecord;
  onVarSelect: (selectedPath: string[]) => void;
};

const VariablesTree: React.FunctionComponent<VariablesTreeProps> = ({
  vars,
  onVarSelect,
}) => (
  <JSONTree
    data={vars}
    theme={theme}
    postprocessValue={postprocessValue}
    shouldExpandNodeInitially={() => true}
    invertTheme
    hideRoot
    labelRenderer={(relativePath) => (
      <NodeLabel path={relativePath} onSelect={onVarSelect} />
    )}
    getItemString={getItemString}
  />
);

export default VariablesTree;
