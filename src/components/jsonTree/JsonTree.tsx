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

import styles from "./JsonTree.module.scss";
import { JSONTree } from "react-json-tree";
import { jsonTreeTheme as theme } from "@/themes/light";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import FieldTemplate from "@/components/form/FieldTemplate";
import Loader from "@/components/Loader";
import { useLabelRenderer } from "./treeHooks";
import {
  get,
  reverse,
  set,
  compact,
  includes,
  isEmpty,
  mapValues,
  pickBy,
} from "lodash";
import { Primitive } from "type-fest";

const SEARCH_DEBOUNCE_MS = 100;

export type TreeExpandedState = {
  [key: string | number]: boolean | TreeExpandedState;
};

export type JsonTreeProps = Partial<JSONTree["props"]> & {
  /**
   * True if user can copy the path properties (default=false)
   */
  copyable?: boolean;

  /**
   * True to show a search widget (default=false)
   */
  searchable?: boolean;

  /**
   * Initial state for the search input
   */
  initialSearchQuery?: string;

  /**
   * Change listener for the search input text
   */
  onSearchQueryChange?: (query: string) => void;

  /**
   * A label to show above the tree when no search query is active
   */
  label?: string;

  /**
   * Nodes to expand on first render
   */
  initialExpandedState?: TreeExpandedState;

  /**
   * Change listener for the expanded state
   */
  onExpandedStateChange?: (
    keyPath: Array<string | number>,
    isExpanded: boolean
  ) => void;
};

function normalize(value: Primitive): string {
  return value.toString().toLowerCase();
}

/**
 * Search data for query, matching both keys and values.
 * @see normalize
 */
function searchData(query: string, data: unknown): unknown {
  const normalizedQuery = normalize(query);
  if (data == null) {
    return null;
  }

  if (typeof data === "object") {
    const values = mapValues(data, (value, key) =>
      includes(normalize(key), normalizedQuery)
        ? value
        : searchData(query, value)
    );
    return pickBy(values, (value, key) => {
      const keyMatch = includes(normalize(key), normalizedQuery);
      const valueMatch =
        typeof value === "object" || Array.isArray(value)
          ? !isEmpty(value)
          : value != null;
      return keyMatch || valueMatch;
    });
  }

  if (Array.isArray(data)) {
    return compact(data.map((d) => searchData(query, d)));
  }

  return includes(normalize(data as Primitive), normalizedQuery)
    ? data
    : undefined;
}

const JsonTree: React.FunctionComponent<JsonTreeProps> = ({
  copyable = false,
  searchable = false,
  initialSearchQuery = "",
  onSearchQueryChange,
  label,
  data,
  initialExpandedState = {},
  onExpandedStateChange,
  ...restProps
}) => {
  const [query, setQuery] = useState(initialSearchQuery);

  const [debouncedQuery] = useDebounce(query, SEARCH_DEBOUNCE_MS, {
    trailing: true,
    leading: false,
  });

  const searchResults = useMemo(() => {
    if (debouncedQuery === "" || data == null) {
      return data;
    }

    return searchData(debouncedQuery, data);
  }, [debouncedQuery, data]);

  const copyLabelRenderer = useLabelRenderer();

  const onChangeQuery = useCallback(
    ({ target }: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(target.value);
      onSearchQueryChange?.(target.value);
    },
    [onSearchQueryChange]
  );

  // The initialExpandedState is only used for initialization. The actual expanded state is handled by JSONTree internally.
  const initialExpanded = useRef(initialExpandedState).current;
  const setExpanded = (
    keyPath: Array<string | number>,
    isExpanded: boolean
  ) => {
    if (onExpandedStateChange) {
      onExpandedStateChange(keyPath, isExpanded);
    }
  };

  const getExpanded = (keyPath: Array<string | number>) =>
    Boolean(get(initialExpanded, reverse([...keyPath])));

  const labelText = query ? `Search Results: ${query}` : label;

  return (
    <div className={styles.root}>
      {searchable && (
        <FieldTemplate
          value={query}
          name="traceSearch"
          label="Search"
          placeholder="Search for a property or value"
          onChange={onChangeQuery}
          fitLabelWidth
        />
      )}
      {labelText && <span>{labelText}</span>}
      {searchResults === undefined ? (
        <Loader />
      ) : (
        <JSONTree
          data={searchResults}
          labelRenderer={(keyPath, nodeType, expanded, expandable) => {
            if (expandable && getExpanded(keyPath) !== expanded) {
              setExpanded(keyPath, expanded);
            }

            return copyable ? (
              copyLabelRenderer(keyPath, nodeType, expanded)
            ) : (
              <span>{keyPath[0]}:</span>
            );
          }}
          hideRoot
          theme={{
            extend: theme,
            value: ({ style }) => ({
              style: {
                ...style,
                whiteSpace: "pre-wrap",
              },
            }),
          }}
          invertTheme
          shouldExpandNode={(keyPath) => getExpanded(keyPath)}
          {...restProps}
        />
      )}
    </div>
  );
};

export default JsonTree;
