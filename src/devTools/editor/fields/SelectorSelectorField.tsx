/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, {
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useField } from "formik";
import { compact, isEmpty, sortBy, uniqBy } from "lodash";
import { Button } from "react-bootstrap";
import { faMousePointer } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { selectElement, enableSelectorOverlay, disableOverlay } from "@/background/devtools";
import { DevToolsContext } from "@/devTools/context";
import { SelectMode } from "@/nativeEditor/selector";
import { ElementInfo } from "@/nativeEditor/frameworks";
import { Framework } from "@/messaging/constants";
import { reportError } from "@/telemetry/logging";
import { useToasts } from "react-toast-notifications";
import CreatableAutosuggest, { SuggestionTypeBase } from "@/devTools/editor/fields/creatableAutosuggest/CreatableAutosuggest";
import SelectorListItem from "@/devTools/editor/fields/selectorListItem/SelectorListItem";

interface ElementSuggestion extends SuggestionTypeBase {
  value: string
  elementInfo?: ElementInfo
}

function getSuggestionsForElement(elementInfo: ElementInfo | undefined): ElementSuggestion[] {
  if (!elementInfo) {
    return [];
  }

  return uniqBy(
    compact([
      ...elementInfo.selectors.map((value) => ({ value, elementInfo })),
      ...getSuggestionsForElement(elementInfo.parent)
    ]).filter((suggestion) => suggestion.value && suggestion.value.trim() !== "")
  , (suggestion) => suggestion.value);
}

function renderSuggestion(suggestion: ElementSuggestion): React.ReactNode {
  return <SelectorListItem
    value={suggestion.value}
    hasData={suggestion.elementInfo.hasData}
    tag={suggestion.elementInfo.tagName}
  />
}

interface CommonProps {
  initialElement?: ElementInfo;
  framework?: Framework;
  selectMode?: SelectMode;
  traverseUp?: number;
  isClearable?: boolean;
  sort?: boolean;
  root?: string;
  disabled?: boolean;
}

export const SelectorSelectorControl: React.FunctionComponent<
  CommonProps & {
    value: string;
    onSelect: (selector: string) => void;
  }
> = ({
  value,
  onSelect,
  initialElement,
  framework,
  selectMode = "element",
  traverseUp = 0,
  isClearable = false,
  sort = false,
  root,
  disabled = false,
}) => {
  const { port } = useContext(DevToolsContext);
  const { addToast } = useToasts();
  const [element, setElement] = useState(initialElement);
  const [isSelecting, setSelecting] = useState(false);

  const suggestions: ElementSuggestion[] = useMemo(() => {
    const raw = getSuggestionsForElement(element);
    return sort ? sortBy(raw, (x) => x.value.length) : raw;
  }, [element, sort]);

  const enableSelector = useCallback((selector: string) => {
    try {
      void enableSelectorOverlay(port, selector);
    } catch {
      // The enableSelector function throws errors on invalid selector
      // values, so we're eating everything here since this fires any
      // time the user types in the input.
    }
  },[port]);

  const disableSelector = useCallback(() => {
    void disableOverlay(port);
  },[port]);

  const onHighlighted = useCallback((suggestion: ElementSuggestion | null) => {
    if (suggestion) {
      enableSelector(suggestion.value);
    } else {
      disableSelector();
    }
  }, [enableSelector, disableSelector]);

  const onTextChanged = useCallback((value: string) => {
    disableSelector();
    enableSelector(value);
    onSelect(value);
  }, [disableSelector, enableSelector, onSelect]);

  const select = useCallback(async () => {
    setSelecting(true);
    try {
      const selected = await selectElement(port, {
        framework,
        mode: selectMode,
        traverseUp,
        root,
      });

      if (isEmpty(selected)) {
        reportError(new Error("selectElement returned empty object"));
        addToast("Unknown error selecting element", {
          appearance: "error",
          autoDismiss: true,
        });
        return;
      }

      setElement(selected);

      const selectors = selected.selectors ?? [];

      const firstSelector = (sort
        ? sortBy(selectors, (x) => x.length)
        : selectors)[0];

      console.debug("Setting selector", { selected, firstSelector });
      onSelect(firstSelector);
    } catch (error: unknown) {
      reportError(error);
      addToast(`Error selecting element: ${error.toString()} `, {
        appearance: "error",
        autoDismiss: true,
      });
    } finally {
      setSelecting(false);
    }
  }, [
    port,
    sort,
    framework,
    addToast,
    setSelecting,
    traverseUp,
    selectMode,
    setElement,
    onSelect,
    root,
  ]);

  return (
    <div className="d-flex">
      <div>
        <Button
          onClick={select}
          disabled={isSelecting || disabled}
          variant="info"
          aria-label="Select element"
        >
          <FontAwesomeIcon icon={faMousePointer} />
        </Button>
      </div>
      <div className="flex-grow-1">
        <CreatableAutosuggest
          isClearable={isClearable}
          isDisabled={isSelecting || disabled}
          suggestions={suggestions}
          inputValue={value}
          inputPlaceholder="Choose a selector..."
          renderSuggestion={renderSuggestion}
          onSuggestionHighlighted={onHighlighted}
          onSuggestionsClosed={disableSelector}
          onTextChanged={onTextChanged}
        />
      </div>
    </div>
  );
};

const SelectorSelectorField: React.FunctionComponent<
  CommonProps & { name?: string }
> = ({ name, ...props }) => {
  const [field, , helpers] = useField(name);
  return (
    <SelectorSelectorControl
      value={field.value}
      onSelect={helpers.setValue}
      {...props}
    />
  );
};

export default SelectorSelectorField;
