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

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styles from "./VarMenu.module.scss";
import { selectKnownVarsForActiveNode } from "./varSelectors";
import VariablesTree from "./VariablesTree";
import {
  selectActiveModComponentFormState,
  selectPipelineMap,
} from "@/pageEditor/store/editor/editorSelectors";
import { ADAPTERS } from "@/pageEditor/starterBricks/adapter";
import SourceLabel from "./SourceLabel";
import useAllBricks from "@/bricks/hooks/useAllBricks";
import { useAsyncEffect } from "use-async-effect";
import { computePosition, flip, offset, size } from "@floating-ui/dom";
import getMenuOptions from "./getMenuOptions";
import { selectActiveNodeTrace } from "@/pageEditor/store/runtime/runtimeSelectors";
import {
  filterOptionsByVariable,
  filterVarMapByVariable,
} from "@/components/fields/schemaFields/widgets/varPopup/menuFilters";
import cx from "classnames";
import VarMap from "@/analysis/analysisVisitors/varAnalysis/varMap";
import useKeyboardNavigation from "@/components/fields/schemaFields/widgets/varPopup/useKeyboardNavigation";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import useAsyncState from "@/hooks/useAsyncState";
import { getPageState } from "@/contentScript/messenger/api";
import { isEmpty } from "lodash";
import { getSelectedLineVirtualElement } from "@/components/fields/schemaFields/widgets/varPopup/utils";
import { inspectedTab } from "@/pageEditor/context/connection";
import useEventListener from "@/hooks/useEventListener";
import { StateNamespaces } from "@/platform/state/stateController";

const emptyVarMap = new VarMap();

type VarMenuProps = {
  /**
   * The underlying var or text input element.
   */
  inputElementRef: React.MutableRefObject<
    HTMLTextAreaElement | HTMLInputElement
  >;
  /**
   * The likely variable the user is interacting with.
   */
  likelyVariable: string | null;
  /**
   * The start index of the likelyVariable - used to
   * identify when the menu needs to be repositioned
   */
  variablePosition: number | null;
  /**
   * Callback to close the menu.
   */
  onClose: () => void;
  /**
   * Callback to select a menu item
   */
  onVarSelect: (selectedPath: string[]) => void;
};

function usePositionVarPopup({
  knownVars,
  inputElementRef,
  variablePosition,
}: {
  knownVars: VarMap;
  inputElementRef: VarMenuProps["inputElementRef"];
  variablePosition: number;
}) {
  const dispatch = useDispatch();
  const rootElementRef = useRef<HTMLDivElement>(null);
  const [resize, setResize] = useState(0);
  // Whether the final position has been computed and the var container has been translated
  const [positioned, setPositioned] = useState(false);

  // Use ResizeObserver to detect changes in the height of the menu
  // This is especially important when the menu is above the textarea
  useEffect(() => {
    const element = rootElementRef.current;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentBoxSize) {
          setResize(entry.contentBoxSize[0].blockSize);
        }
      }
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useAsyncEffect(async () => {
    if (!inputElementRef.current || !rootElementRef.current) {
      return;
    }

    // Virtual element for the selected line
    const selectedLineBorderBox = getSelectedLineVirtualElement(
      inputElementRef.current,
    );

    const position = await computePosition(
      selectedLineBorderBox,
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
          }),
        ],
      },
    );

    rootElementRef.current.style.transform = `translate3d(0, ${position.y}px, 0)`;
    setPositioned(true);

    // While the menu position does not rely on the knownVars, the resize state or the variable position
    // we need to recompute the position when either of these change.
  }, [knownVars, dispatch, resize, variablePosition]);

  return { rootElementRef, positioned };
}

const VarMenu: React.FunctionComponent<VarMenuProps> = ({
  inputElementRef,
  onClose,
  onVarSelect,
  likelyVariable,
  variablePosition,
}) => {
  const dispatch = useDispatch();
  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );
  const pipelineMap = useSelector(selectPipelineMap) ?? {};
  const { allBricks } = useAllBricks();

  const knownVars = useSelector(selectKnownVarsForActiveNode);
  const { rootElementRef, positioned } = usePositionVarPopup({
    knownVars,
    inputElementRef,
    variablePosition,
  });

  const trace = useSelector(selectActiveNodeTrace);
  const { data: modVariables } = useAsyncState(
    async () =>
      getPageState(inspectedTab, {
        namespace: StateNamespaces.MOD,
        modComponentId: null,
        modId: activeModComponentFormState.modMetadata?.id,
      }),
    [],
  );

  useEventListener(document, "click", (event: MouseEvent) => {
    const parent = rootElementRef.current?.parentElement;
    if (parent && !parent.contains(event.target as Node)) {
      onClose();
    }
  });

  useEffect(() => {
    dispatch(editorActions.showVariablePopover());

    return () => {
      dispatch(editorActions.hideVariablePopover());
    };
  }, [dispatch]);

  const starterBrickLabel = activeModComponentFormState?.type
    ? ADAPTERS.get(activeModComponentFormState.type).label
    : "";

  const { allOptions, filteredOptions } = useMemo(() => {
    const values = { ...trace?.templateContext };
    if (!isEmpty(modVariables)) {
      values["@mod"] = modVariables;
    }

    const allOptions = getMenuOptions(knownVars ?? emptyVarMap, values);

    return {
      allOptions,
      filteredOptions: filterOptionsByVariable(allOptions, likelyVariable),
    };
  }, [knownVars, trace?.templateContext, likelyVariable, modVariables]);

  const blocksInfo = Object.values(pipelineMap);

  const { activeKeyPath } = useKeyboardNavigation({
    inputElementRef,
    isVisible: Boolean(rootElementRef.current),
    likelyVariable,
    menuOptions: filteredOptions,
    onSelect: onVarSelect,
  });

  // Render a hidden element if the component has not been positioned yet to avoid jumpiness
  // when the menu is shown. This is needed because the position is computed asynchronously (see usePositionVarPopup).
  // Also see the discussion thread for floating-ui to support synchronous computePosition:
  // https://github.com/floating-ui/floating-ui/discussions/2720
  if (!positioned) {
    return <div className="hidden" ref={rootElementRef} />;
  }

  if (knownVars == null) {
    return (
      <div className={styles.menu} ref={rootElementRef}>
        <div className={cx(styles.sourceItem, "text-info")}>
          Available variables have not been computed yet.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.menu} ref={rootElementRef}>
      <div className={styles.body}>
        {filteredOptions.length === 0 && (
          <>
            <div className={cx(styles.sourceItem, "text-info")}>
              No variables found for <span>{likelyVariable}</span>
            </div>
            {allOptions.map(([source, vars]) => (
              // Show all top-level sources if no vars match
              <div className={styles.sourceItem} key={source}>
                <SourceLabel
                  source={source}
                  extensionPointLabel={starterBrickLabel}
                  nodes={blocksInfo}
                  allBricks={allBricks}
                />
                <VariablesTree
                  vars={vars}
                  onVarSelect={onVarSelect}
                  likelyVariable={likelyVariable}
                  activeKeyPath={activeKeyPath}
                />
              </div>
            ))}
          </>
        )}
        {filteredOptions.map(([source, vars]) => (
          <div className={styles.sourceItem} key={source}>
            <SourceLabel
              source={source}
              extensionPointLabel={starterBrickLabel}
              nodes={blocksInfo}
              allBricks={allBricks}
            />
            <VariablesTree
              vars={filterVarMapByVariable(vars, likelyVariable)}
              onVarSelect={onVarSelect}
              likelyVariable={likelyVariable}
              activeKeyPath={activeKeyPath}
            />
          </div>
        ))}
      </div>
      <div className={styles.footer}>
        Use up/down keys to navigate, tab to select
      </div>
    </div>
  );
};

export default React.memo(VarMenu);
