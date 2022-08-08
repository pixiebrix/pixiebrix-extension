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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCode } from "@fortawesome/free-solid-svg-icons";
import cx from "classnames";
import { copyTextToClipboard } from "@/utils";
import notify from "@/utils/notify";
import safeJsonStringify from "json-stringify-safe";
import { Button } from "react-bootstrap";
import styles from "./JsonTree.module.scss";

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
export function searchData(query: string, data: unknown): unknown {
  const normalizedQuery = normalize(query);
  if (data == null) {
    return null;
  }

  // Array check must come before the object check
  if (Array.isArray(data)) {
    return compact(data.map((d) => searchData(query, d)));
  }

  if (typeof data === "object") {
    const values = mapValues(data, (value, key) =>
      includes(normalize(key), normalizedQuery)
        ? value
        : searchData(query, value)
    );
    const pickResult = pickBy(values, (value, key) => {
      const keyMatch = includes(normalize(key), normalizedQuery);
      const valueMatch =
        typeof value === "object" // This check covers arrays as well
          ? !isEmpty(value)
          : value != null;
      return keyMatch || valueMatch; // TODO: We might want slightly different behavior here depending on which one matches, and if the match is "nested" or not - see tests
    });
    return isEmpty(pickResult) ? undefined : pickResult;
  }

  return includes(normalize(data as Primitive), normalizedQuery)
    ? data
    : undefined;
}

const jsonTreeTheme: Theme = {
  extend: theme,
  value: ({ style }: Styling) => ({
    style: {
      ...style,
      whiteSpace: "pre-wrap",
    },
  }),
};

const CopyDataButton: React.FunctionComponent<{ data: unknown }> = ({
  data,
}) => (
  <Button
    variant="text"
    className={cx(styles.copyPath, "p-0")}
    type="button"
    aria-label="copy data"
    onClick={async () => {
      await copyTextToClipboard(safeJsonStringify(data, null, 2));
      notify.info("Copied data to the clipboard");
    }}
  >
    <FontAwesomeIcon icon={faCode} aria-hidden />
  </Button>
);

/**
 * Internally a memoized component is used, be mindful about the reference equality of the props
 */
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

  const getExpanded = useCallback(
    (keyPath: Array<string | number>) =>
      Boolean(get(expandedStateRef.current, reverse([...keyPath]))),
    []
  );

  const labelRenderer = useCallback(
    (
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
          onExpandedStateChange(nextExpandedState);
        }
      }

      return copyable ? (
        copyLabelRenderer(keyPath, nodeType, isExpanded)
      ) : (
        <span>{keyPath[0]}:</span>
      );
    },
    [onExpandedStateChange, getExpanded, copyLabelRenderer, copyable]
  );

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
      {labelText && (
        <span>
          {labelText}&nbsp;
          <CopyDataButton data={searchResults} />
        </span>
      )}
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
