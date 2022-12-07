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

import React from "react";
import { JSONTree } from "react-json-tree";
import { type ExistenceMap } from "@/analysis/analysisVisitors/varAnalysis/varMap";
import { jsonTreeTheme } from "@/themes/light";
import { type UnknownObject } from "@/types";
import { Button } from "react-bootstrap";

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
};

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

type NodeLabelProps = {
  path: Array<string | number>;
  onSelect: (path: string[]) => void;
};

const NodeLabel: React.FunctionComponent<NodeLabelProps> = ({
  path,
  onSelect,
}) => {
  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    onSelect([...path.map(String)].reverse());
  };

  return (
    <Button variant="link" onClick={onClick}>
      {path[0]}
    </Button>
  );
};

type VariablesTreeProps = {
  source: string;
  vars: ExistenceMap;
  onVarSelect: (selectedPath: string[]) => void;
};

const VariablesTree: React.FunctionComponent<VariablesTreeProps> = ({
  source,
  vars,
  onVarSelect,
}) => (
  <JSONTree
    data={vars}
    theme={theme}
    postprocessValue={postprocessValue}
    shouldExpandNode={() => true}
    invertTheme
    hideRoot
    labelRenderer={(relativePath) => (
      <NodeLabel path={[...relativePath, source]} onSelect={onVarSelect} />
    )}
  />
);

export default VariablesTree;
