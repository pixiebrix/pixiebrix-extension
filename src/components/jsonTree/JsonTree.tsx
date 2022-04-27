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
import React, {
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDebounce } from "use-debounce";
import FieldTemplate from "@/components/form/FieldTemplate";
import Loader from "@/components/Loader";
import { useLabelRenderer } from "./treeHooks";
import {
  get,
  reverse,
  compact,
  includes,
  isEmpty,
  mapValues,
  pickBy,
  set,
} from "lodash";
import { Primitive } from "type-fest";
import { produce } from "immer";
import { Styling, Theme } from "react-base16-styling";

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
  onExpandedStateChange?: (nextExpandedState: TreeExpandedState) => void;
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

const MemoizedJsonTree = React.memo(JSONTree);
const jsonTreeTheme: Theme = {
  extend: theme,
  value: ({ style }: Styling) => ({
    style: {
      ...style,
      whiteSpace: "pre-wrap",
    },
  }),
};

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

  // This component doesn't react to state changes, only setting the initial expanded state
  // The actual expanded state is handled by the JSONTree internally
  const expandedStateRef = useRef(initialExpandedState);

  const getExpanded = (keyPath: Array<string | number>) =>
    Boolean(get(expandedStateRef.current, reverse([...keyPath])));

  const labelRenderer = (
    keyPath: Array<string | number>,
    nodeType: string,
    isExpanded: boolean,
    expandable: boolean
  ): ReactNode => {
    if (expandable && getExpanded(keyPath) !== isExpanded) {
      // Using Immer allows to work with immutable objects
      const nextExpandedState = produce(expandedStateRef.current, (draft) => {
        set(draft, reverse([...keyPath]), isExpanded);
      });

      expandedStateRef.current = nextExpandedState;

      if (onExpandedStateChange) {
        console.log("expanding", {
          keyPath,
        });
        onExpandedStateChange(nextExpandedState);
      }
    }

    console.log("labelRenderer", keyPath[0]);

    return copyable ? (
      copyLabelRenderer(keyPath, nodeType, isExpanded)
    ) : (
      <span>{keyPath[0]}:</span>
    );
  };

  const labelText = query ? `Search Results: ${query}` : label;

  console.log("rendering JsonTree");

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
          labelRenderer={labelRenderer}
          hideRoot
          theme={jsonTreeTheme}
          invertTheme
          shouldExpandNode={getExpanded}
          {...restProps}
        />
      )}
    </div>
  );
};

export default JsonTree;
