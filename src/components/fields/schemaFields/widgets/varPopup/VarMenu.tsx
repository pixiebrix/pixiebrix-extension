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

import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import styles from "./VarMenu.module.scss";
import { selectKnownVarsForActiveNode } from "./varSelectors";
import VariablesTree from "./VariablesTree";
import {
  selectActiveElement,
  selectPipelineMap,
} from "@/pageEditor/slices/editorSelectors";
import { KnownSources } from "@/analysis/analysisVisitors/varAnalysis/varAnalysis";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import SourceLabel from "./SourceLabel";
import useAllBlocks from "@/pageEditor/hooks/useAllBlocks";

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

  const activeElement = useSelector(selectActiveElement);
  const pipelineMap = useSelector(selectPipelineMap) ?? {};
  const { allBlocks } = useAllBlocks();

  const knownVars = useSelector(selectKnownVarsForActiveNode);
  if (knownVars == null) {
    return null;
  }

  const extensionPointLabel = activeElement?.type
    ? ADAPTERS.get(activeElement.type).label
    : "";

  return (
    <div className={styles.menu} ref={rootElementRef}>
      <div className={styles.menuList}>
        {Object.entries(knownVars.getMap())
          .filter(([source]) => source !== KnownSources.TRACE)
          .map(([source, vars]) => (
            <div className={styles.sourceItem} key={source}>
              <SourceLabel
                source={source}
                extensionPointLabel={extensionPointLabel}
                blocksInfo={Object.values(pipelineMap)}
                allBlocks={allBlocks}
              />
              <VariablesTree vars={vars} />
            </div>
          ))}
      </div>
    </div>
  );
};

export default VarMenu;
