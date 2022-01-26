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

import React, { FormEvent, useCallback, useMemo, useState, memo } from "react";
import styles from "./CreatableAutosuggest.module.scss";
import Autosuggest, {
  ChangeEvent,
  InputProps,
  OnSuggestionSelected,
} from "react-autosuggest";
import cx from "classnames";
import { noop } from "lodash";
import { Form } from "react-bootstrap";

export interface SuggestionTypeBase {
  value: string;
}

interface CreateNew extends SuggestionTypeBase {
  isNew: boolean;
}

function isNew<T extends SuggestionTypeBase>(
  suggestion: T | CreateNew
): suggestion is CreateNew {
  return suggestion && "isNew" in suggestion;
}

export interface Props<SuggestionType extends SuggestionTypeBase> {
  // Show the X clear button in the input
  isClearable?: boolean;

  // Can the input be focused/edited
  isDisabled?: boolean;

  // List of suggestions for the autosuggest
  suggestions: SuggestionType[];

  // Should we only show suggestions that start with the current input value?
  filterSuggestionsByValue?: boolean;

  // Text value of the input
  inputValue?: string;

  // Placeholder for the input field
  inputPlaceholder?: string;

  // How the suggestion should be displayed
  renderSuggestion: (suggestion: SuggestionType) => React.ReactNode;

  // If provided, how the create option should be displayed
  renderCreateNew?: (value: string) => React.ReactNode;

  // Called when a suggestion is highlighted by mouseover or arrow keys,
  //  also is called with null when nothing is highlighted
  onSuggestionHighlighted?: (suggestion: SuggestionType | null) => void;

  // Callback when the suggestions list is closed
  onSuggestionsClosed?: () => void;

  // Callback for value change event
  onSuggestionSelected?: (suggestion: SuggestionType) => void;

  // Callback for when the create option is selected
  onCreateNew?: (inputValue: string) => SuggestionType;

  // Callback for input text changes, from both user typing and selecting suggestions
  onTextChanged?: (value: string) => void;
}

const filterSuggestions = <T extends SuggestionTypeBase>(
  suggestions: T[],
  value: string
) => {
  const input = value.trim().toLowerCase();
  return input.length === 0
    ? []
    : suggestions.filter((item) => item.value.toLowerCase().startsWith(input));
};

const getSuggestionValue = <SuggestionType extends SuggestionTypeBase>(
  suggestion: SuggestionType
) => suggestion.value;

const CreatableAutosuggest = <SuggestionType extends SuggestionTypeBase>({
  isClearable = true,
  isDisabled = false,
  suggestions,
  filterSuggestionsByValue = false,
  inputValue,
  inputPlaceholder = "",
  renderSuggestion,
  renderCreateNew,
  onSuggestionHighlighted = noop,
  onSuggestionsClosed = noop,
  onSuggestionSelected = noop,
  onCreateNew,
  onTextChanged = noop,
}: Props<SuggestionType>) => {
  const [currentValue, setCurrentValue] = useState(inputValue ?? "");
  const [currentSuggestions, setCurrentSuggestions] = useState<
    Array<SuggestionType | CreateNew>
  >([]);
  const [createdSuggestions, setCreatedSuggestions] = useState<
    SuggestionType[]
  >([]);

  const getSuggestions = useCallback(
    ({ value }: { value: string }) => {
      let newSuggestions: Array<SuggestionType | CreateNew> = [
        ...suggestions,
        ...createdSuggestions,
      ];
      if (filterSuggestionsByValue) {
        newSuggestions = filterSuggestions(newSuggestions, value);
      }

      if (
        !newSuggestions.some((item) => item.value === value) &&
        renderCreateNew !== undefined
      ) {
        newSuggestions.unshift({ value, isNew: true });
      }

      setCurrentSuggestions(newSuggestions);
    },
    [filterSuggestionsByValue, renderCreateNew, suggestions, createdSuggestions]
  );

  const renderSuggestionWithCreateNew = useCallback(
    (suggestion: SuggestionType | CreateNew) =>
      isNew(suggestion)
        ? renderCreateNew(`Create "${suggestion.value}"`)
        : renderSuggestion(suggestion),
    [renderCreateNew, renderSuggestion]
  );

  const onHighlighted = useCallback(
    ({ suggestion }: { suggestion: SuggestionType | CreateNew | null }) => {
      if (isNew(suggestion)) return;
      onSuggestionHighlighted(suggestion);
    },
    [onSuggestionHighlighted]
  );

  const clearSuggestions = useCallback(() => {
    setCurrentSuggestions([]);
    onSuggestionsClosed();
  }, [onSuggestionsClosed]);

  const handleChange = useCallback(
    (event: FormEvent<HTMLElement>, params: ChangeEvent) => {
      onTextChanged(params.newValue);
      setCurrentValue(params.newValue);
    },
    [onTextChanged, setCurrentValue]
  );

  const nativeOnSuggestionSelected: OnSuggestionSelected<
    SuggestionType | CreateNew
  > = (event, data) => {
    if (isNew(data.suggestion)) {
      const newSuggestion = onCreateNew(data.suggestionValue);
      setCreatedSuggestions((existing) => [...existing, newSuggestion]);
      onSuggestionSelected(newSuggestion);
    } else {
      onSuggestionSelected(data.suggestion);
    }
  };

  const onSelected = useCallback(nativeOnSuggestionSelected, [
    onCreateNew,
    onSuggestionSelected,
  ]);

  const value = inputValue ?? currentValue ?? "";

  const inputProps: InputProps<SuggestionType> = useMemo(
    () => ({
      type: "search",
      value,
      onChange: handleChange,
      placeholder: inputPlaceholder,
      disabled: isDisabled,
    }),
    [value, handleChange, inputPlaceholder, isDisabled]
  );

  const theme = useMemo(
    () => ({
      input: cx("form-control", styles.input, {
        [styles.notClearable]: !isClearable,
      }),
      suggestionsContainer: "dropdown",
      suggestionsList: cx("dropdown-menu", "show", styles.suggestionList),
      suggestion: "dropdown-item text-wrap",
      suggestionHighlighted: "active",
    }),
    [isClearable]
  );

  if (typeof value !== "string") {
    // Cowardly bail on non-string values
    // https://github.com/moroshko/react-autosuggest/issues/510
    console.warn("CreatableAutosuggest received non-string value", {
      inputValue,
      currentValue,
    });
    return <Form.Control plaintext readOnly defaultValue="Unsupported Value" />;
  }

  return (
    <Autosuggest
      suggestions={currentSuggestions}
      focusInputOnSuggestionClick
      getSuggestionValue={getSuggestionValue}
      inputProps={inputProps}
      onSuggestionHighlighted={onHighlighted}
      onSuggestionsFetchRequested={getSuggestions}
      onSuggestionsClearRequested={clearSuggestions}
      onSuggestionSelected={onSelected}
      renderSuggestion={renderSuggestionWithCreateNew}
      theme={theme}
    />
  );
};

export default memo(CreatableAutosuggest);
