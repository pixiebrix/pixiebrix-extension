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

import { ExistenceMap } from "@/analysis/analysisVisitors/varAnalysis/varMap";
import React, { useEffect, useRef } from "react";
import { JSONTree } from "react-json-tree";
import { useSelector } from "react-redux";
import styles from "./VarMenu.module.scss";
import { selectKnownVarsForActiveNode } from "./varSelectors";
import { jsonTreeTheme } from "@/themes/light";
import { UnknownObject } from "@/types";

type SourceLabelProps = {
  source: string;
};

const SourceLabel: React.FunctionComponent<SourceLabelProps> = ({ source }) => (
  <div>{source}</div>
);

type VariablesTreeProps = {
  vars: ExistenceMap;
};

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
  const valueA = obj[a];
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

export const VariablesTree: React.FunctionComponent<VariablesTreeProps> = ({
  vars,
}) => (
  <JSONTree
    data={vars}
    theme={theme}
    postprocessValue={postprocessValue}
    invertTheme
    hideRoot
  />
);

type VarMenuProps = {
  onClose?: () => void;
};

const VarMenu: React.FunctionComponent<VarMenuProps> = ({ onClose }) => {
  const rootElementRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const parent = rootElementRef.current?.parentElement;
      if (parent && !parent.contains(event.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [onClose]);

  const knownVars = useSelector(selectKnownVarsForActiveNode);
  if (knownVars == null) {
    return null;
  }

  return (
    <div className={styles.menu} ref={rootElementRef}>
      <div className={styles.menuList}>
        {Object.entries(knownVars.getMap())
          .filter(([source]) => source !== "trace")
          .map(([source, vars]) => (
            <div className={styles.sourceItem} key={source}>
              <SourceLabel source={source} />
              <VariablesTree vars={vars} />
            </div>
          ))}
      </div>
    </div>
  );
};

export default VarMenu;
