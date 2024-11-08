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

import styles from "./SelectorSelectorWidget.module.scss";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import notify from "../../utils/notify";
import { isEmpty, uniqBy } from "lodash";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMousePointer } from "@fortawesome/free-solid-svg-icons";
import CreatableAutosuggest, {
  type SuggestionTypeBase,
} from "./creatableAutosuggest/CreatableAutosuggest";
import SelectorListItem from "./selectorListItem/SelectorListItem";
import { type Framework } from "../../pageScript/messenger/constants";
import { useField } from "formik";
import {
  disableOverlay,
  enableOverlay,
  cancelSelect,
  selectElement,
} from "../../contentScript/messenger/api";
import { type SelectMode } from "../../contentScript/pageEditor/types";
import { useSelector } from "react-redux";
import { type SettingsState } from "../../store/settings/settingsTypes";
import { sortBySelector } from "../../utils/inference/selectorInference";
import { isSpecificError } from "../../errors/errorHelpers";
import { CancelError } from "../../errors/businessErrors";
import { type Expression } from "../../types/runtimeTypes";
import {
  castTextLiteralOrThrow,
  isTextLiteralOrNull,
} from "../../utils/expressionUtils";
import WorkshopMessageWidget from "../../components/fields/schemaFields/widgets/WorkshopMessageWidget";
import { type ElementInfo } from "../../utils/inference/selectorTypes";
import { inspectedTab } from "../context/connection";
import { type Nullishable } from "../../utils/nullishUtils";

interface ElementSuggestion extends SuggestionTypeBase {
  value: string;
  elementInfo?: ElementInfo;
}

export type SelectorSelectorProps = {
  /**
   * The name of the field.
   */
  name: string;
  /**
   * True to disable the widget.
   */
  disabled?: boolean;
  /**
   * The initial value for the widget.
   */
  initialElement?: ElementInfo;
  /**
   * The framework to extract JS data from the associated React/Vue/AngularJS component.
   * @deprecated
   */
  framework?: Framework;
  /**
   * True to default to selecting multiple elements.
   * @since 1.7.33
   */
  isMulti?: boolean;
  /**
   * Mode to select a single element or a container (for placing a button/panel inline on the page).
   */
  selectMode?: SelectMode;
  /**
   * The number of levels in the React/Vue/AngularJS component hierarchy to traverse up from the selected DOM element.
   * @deprecated
   */
  traverseUp?: number;
  /**
   * True to enable clearing the selector.
   */
  isClearable?: boolean;
  /**
   * True to automatically sort the inferred selectors by length.
   */
  sort?: boolean;
  /**
   * Root selector to infer selectors from. If not provided, document will be used as a root
   */
  root?: string;
  /**
   * Placeholder for the text input
   */
  placeholder?: string;
  onChange?: (value: string | undefined, isMulti: boolean) => void;
};

/**
 * Returns suggestion for the given element to show in the widget dropdown
 * @param elementInfo the element to generate suggestions for
 * @param sort true to sort the suggestions by selector preference (quality heuristic)
 *
 * @see getSelectorPreference
 */
export function getSuggestionsForElement(
  elementInfo: Nullishable<ElementInfo>,
  { sort }: { sort: boolean },
): ElementSuggestion[] {
  if (!elementInfo) {
    return [];
  }

  const suggestions = uniqBy(
    [
      elementInfo.selectors?.map((value) => ({ value, elementInfo })),
      getSuggestionsForElement(elementInfo.parent, { sort }),
    ]
      .flat()
      .filter((suggestion) => suggestion?.value?.trim()),
    (suggestion) => suggestion.value,
  );

  if (sort) {
    return sortBySelector(suggestions, (x) => x.value);
  }

  return suggestions;
}

function renderSuggestion(suggestion: ElementSuggestion): React.ReactNode {
  return (
    <SelectorListItem
      value={suggestion.value}
      tag={suggestion.elementInfo?.tagName ?? null}
    />
  );
}

const SelectorSelectorWidget: React.FC<SelectorSelectorProps> = ({
  name,
  initialElement,
  selectMode = "element",
  isMulti = false,
  isClearable = false,
  root,
  disabled = false,
  placeholder = "Select an element",
  // By default, sort by preference in `element` selection mode. Don't sort in `container` mode because
  // the order is based on structure (because selectors for multiple elements are returned).
  sort = selectMode === "element",
  onChange,
}) => {
  const [{ value: valueOrExpression }, , { setValue }] = useField<
    string | Expression | undefined
  >(name);

  const [element, setElement] = useState(initialElement);
  const [isSelecting, setSelecting] = useState(false);

  const excludeRandomClasses = useSelector<
    { settings: SettingsState },
    boolean
  >((x) => x.settings.excludeRandomClasses ?? false);

  const suggestions: ElementSuggestion[] = useMemo(
    () =>
      getSuggestionsForElement(element, { sort: sort && !element?.isMulti }),
    [element, sort],
  );

  const enableSelector = useCallback((selector: string) => {
    if (selector.trim()) {
      void enableOverlay(inspectedTab, selector);
    }
  }, []);

  const disableSelector = useCallback(() => {
    void disableOverlay(inspectedTab);
  }, []);

  const onHighlighted = useCallback(
    (suggestion: ElementSuggestion | null) => {
      if (suggestion) {
        enableSelector(suggestion.value);
      } else {
        disableSelector();
      }
    },
    [enableSelector, disableSelector],
  );

  const onTextChanged = useCallback(
    async (value: string) => {
      disableSelector();
      enableSelector(value);
      await setValue(value);
    },
    [disableSelector, enableSelector, setValue],
  );

  useEffect(
    () => () => {
      if (isSelecting) {
        void cancelSelect(inspectedTab);
      }
    },
    [isSelecting],
  );

  const select = async () => {
    setSelecting(true);
    try {
      const selected = await selectElement(inspectedTab, {
        mode: selectMode,
        root,
        excludeRandomClasses,
        isMulti,
      });

      if (isEmpty(selected)) {
        notify.error({
          message: "Unknown error selecting element",
          error: new Error("selectElement returned empty object"),
        });
        return;
      }

      setElement(selected);

      const selectors = selected.selectors ?? [];
      const [firstSelector] =
        sort && !selected.isMulti ? sortBySelector(selectors) : selectors;

      console.debug("Setting selector", { selected, firstSelector });
      await setValue(firstSelector);
      onChange?.(firstSelector, Boolean(selected.isMulti));
    } catch (error) {
      if (isSpecificError(error, CancelError)) {
        return;
      }

      notify.error({
        message: "Error selecting element",
        error,
      });
    } finally {
      setSelecting(false);
    }
  };

  if (!isTextLiteralOrNull(valueOrExpression)) {
    return <WorkshopMessageWidget />;
  }

  return (
    // Do not replace this with `InputGroup` because that requires too many style overrides #2658 #2835
    <div className={styles.root}>
      <Button
        onClick={select}
        disabled={isSelecting || disabled}
        variant="info"
        aria-label="Select element"
      >
        <FontAwesomeIcon icon={faMousePointer} />
      </Button>
      <CreatableAutosuggest
        isClearable={isClearable}
        isDisabled={isSelecting || disabled}
        suggestions={suggestions}
        inputValue={castTextLiteralOrThrow(valueOrExpression)}
        inputPlaceholder={placeholder}
        renderSuggestion={renderSuggestion}
        onSuggestionHighlighted={onHighlighted}
        onSuggestionsClosed={disableSelector}
        onTextChanged={onTextChanged}
      />
    </div>
  );
};

export default SelectorSelectorWidget;
