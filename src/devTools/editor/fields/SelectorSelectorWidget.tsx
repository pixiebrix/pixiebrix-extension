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

import styles from "./SelectorSelectorWidget.module.scss";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import useNotifications from "@/hooks/useNotifications";
import { compact, isEmpty, sortBy, uniqBy } from "lodash";
import { getErrorMessage } from "@/errors";
import { Button, InputGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMousePointer } from "@fortawesome/free-solid-svg-icons";
import CreatableAutosuggest, {
  SuggestionTypeBase,
} from "@/devTools/editor/fields/creatableAutosuggest/CreatableAutosuggest";
import { ElementInfo } from "@/nativeEditor/frameworks";
import SelectorListItem from "@/devTools/editor/fields/selectorListItem/SelectorListItem";
import { Framework } from "@/messaging/constants";
import { SelectMode } from "@/nativeEditor/selector";
import { useField } from "formik";
import {
  disableOverlay,
  enableOverlay,
  selectElement,
  cancelSelect,
} from "@/contentScript/messenger/api";
import { thisTab } from "@/devTools/utils";

interface ElementSuggestion extends SuggestionTypeBase {
  value: string;
  elementInfo?: ElementInfo;
}

export type SelectorSelectorProps = {
  name: string;
  disabled?: boolean;
  initialElement?: ElementInfo;
  framework?: Framework;
  selectMode?: SelectMode;
  traverseUp?: number;
  isClearable?: boolean;
  sort?: boolean;
  root?: string;
  placeholder?: string;
};

function getSuggestionsForElement(
  elementInfo: ElementInfo | undefined
): ElementSuggestion[] {
  if (!elementInfo) {
    return [];
  }

  return uniqBy(
    compact([
      ...(elementInfo.selectors ?? []).map((value) => ({ value, elementInfo })),
      ...getSuggestionsForElement(elementInfo.parent),
    ]).filter(
      (suggestion) => suggestion.value && suggestion.value.trim() !== ""
    ),
    (suggestion) => suggestion.value
  );
}

function renderSuggestion(suggestion: ElementSuggestion): React.ReactNode {
  return (
    <SelectorListItem
      value={suggestion.value}
      hasData={suggestion.elementInfo.hasData}
      tag={suggestion.elementInfo.tagName}
    />
  );
}

const SelectorSelectorWidget: React.FC<SelectorSelectorProps> = ({
  name,
  initialElement,
  framework,
  selectMode = "element",
  traverseUp = 0,
  isClearable = false,
  // Leave off default here because we dynamically determine default based on `selectMode`
  sort: rawSort,
  root,
  disabled = false,
  placeholder = "Choose a selector...",
}) => {
  const [{ value }, , { setValue }] = useField<string>(name);

  // By default, sort by selector length in `element` selection mode. Don't sort in `container` mode because
  // the order is based on structure (because selectors for multiple elements are returned).
  const defaultSort = selectMode === "element";
  const sort = rawSort ?? defaultSort;

  const notify = useNotifications();
  const [element, setElement] = useState(initialElement);
  const [isSelecting, setSelecting] = useState(false);

  const suggestions: ElementSuggestion[] = useMemo(() => {
    const raw = getSuggestionsForElement(element);
    return sort ? sortBy(raw, (x) => x.value.length) : raw;
  }, [element, sort]);

  const enableSelector = useCallback((selector: string) => {
    if (selector.trim()) {
      void enableOverlay(thisTab, selector);
    }
  }, []);

  const disableSelector = useCallback(() => {
    void disableOverlay(thisTab);
  }, []);

  const onHighlighted = useCallback(
    (suggestion: ElementSuggestion | null) => {
      if (suggestion) {
        enableSelector(suggestion.value);
      } else {
        disableSelector();
      }
    },
    [enableSelector, disableSelector]
  );

  const onTextChanged = useCallback(
    (value: string) => {
      disableSelector();
      enableSelector(value);
      setValue(value);
    },
    [disableSelector, enableSelector, setValue]
  );

  const select = useCallback(async () => {
    setSelecting(true);
    try {
      const selected = await selectElement(thisTab, {
        framework,
        mode: selectMode,
        traverseUp,
        root,
      });

      if (isEmpty(selected)) {
        notify.error("Unknown error selecting element", {
          error: new Error("selectElement returned empty object"),
        });
        return;
      }

      setElement(selected);

      const selectors = selected.selectors ?? [];

      const firstSelector = (sort
        ? sortBy(selectors, (x) => x.length)
        : selectors)[0];

      console.debug("Setting selector", { selected, firstSelector });
      setValue(firstSelector);
    } catch (error) {
      notify.error(`Error selecting element: ${getErrorMessage(error)}`, {
        error,
      });
    } finally {
      setSelecting(false);
    }
  }, [
    sort,
    framework,
    notify,
    setSelecting,
    traverseUp,
    selectMode,
    setElement,
    setValue,
    root,
  ]);

  useEffect(
    () => () => {
      if (isSelecting) {
        void cancelSelect(thisTab);
      }
    },
    [isSelecting]
  );

  return (
    <InputGroup className={styles.root}>
      <InputGroup.Prepend>
        <Button
          onClick={select}
          disabled={isSelecting || disabled}
          variant="info"
          aria-label="Select element"
        >
          <FontAwesomeIcon icon={faMousePointer} />
        </Button>
      </InputGroup.Prepend>
      <CreatableAutosuggest
        isClearable={isClearable}
        isDisabled={isSelecting || disabled}
        suggestions={suggestions}
        inputValue={value}
        inputPlaceholder={placeholder}
        renderSuggestion={renderSuggestion}
        onSuggestionHighlighted={onHighlighted}
        onSuggestionsClosed={disableSelector}
        onTextChanged={onTextChanged}
      />
    </InputGroup>
  );
};

export default SelectorSelectorWidget;
