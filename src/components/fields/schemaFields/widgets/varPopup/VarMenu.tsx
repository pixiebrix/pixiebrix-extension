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
import { useAsyncEffect } from "use-async-effect";
import { computePosition, size, flip, offset } from "@floating-ui/dom";

type VarMenuProps = {
  inputElementRef: React.MutableRefObject<HTMLElement>;
  onClose?: () => void;
};

const VarMenu: React.FunctionComponent<VarMenuProps> = ({
  inputElementRef,
  onClose,
}) => {
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

  useAsyncEffect(async () => {
    if (
      !inputElementRef.current ||
      !rootElementRef.current ||
      knownVars == null
    ) {
      return;
    }

    const position = await computePosition(
      inputElementRef.current,
      rootElementRef.current,
      {
        placement: "bottom-start",
        middleware: [
          offset(8),
          flip({
            flipAlignment: false,
            padding: 8,
          }),
          size({
            padding: 8,
            apply({ availableHeight, elements }) {
              Object.assign(elements.floating.style, {
                maxHeight: `${availableHeight}px`,
              });
            },
          }),
        ],
      }
    );

    if (rootElementRef.current == null) {
      return;
    }

    rootElementRef.current.style.transform = `translate3d(0, ${position.y}px, 0)`;
  }, [knownVars]);

  if (knownVars == null) {
    return null;
  }

  const extensionPointLabel = activeElement?.type
    ? ADAPTERS.get(activeElement.type).label
    : "";

  const options = Object.entries(knownVars.getMap()).filter(
    ([source]) => source !== KnownSources.TRACE
  );

  return (
    <div className={styles.menu} ref={rootElementRef}>
      {options.map(([source, vars]) => (
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
  );
};

export default VarMenu;
