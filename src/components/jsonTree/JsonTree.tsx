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

import JSONTree from "react-json-tree";
import { jsonTreeTheme as theme } from "@/themes/light";
import React, { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import FieldTemplate from "@/components/form/FieldTemplate";
import styles from "./JsonTree.module.scss";
import GridLoader from "react-spinners/GridLoader";
import { searchData } from "@/devTools/utils";
import { useLabelRenderer } from "./treeHooks";

const SEARCH_DEBOUNCE_MS = 100;

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
   * A label to show above the tree when no search query is active
   */
  label?: string;
};

const JsonTree: React.FunctionComponent<JsonTreeProps> = ({
  copyable = false,
  searchable = false,
  label,
  data,
  ...restProps
}) => {
  const [query, setQuery] = useState("");

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
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
    },
    [setQuery]
  );

  const labelText = query ? `Search Results: ${query}` : label;

  return (
    <div className={styles.root}>
      {searchable && (
        <FieldTemplate
          value={query}
          name="traceSearch"
          label="Search"
          layout="horizontal"
          placeholder="Search for a property or value"
          onChange={onChangeQuery}
        />
      )}
      {labelText && <span>{label}</span>}
      {searchResults === undefined ? (
        <GridLoader />
      ) : (
        <JSONTree
          data={searchResults}
          labelRenderer={copyable ? copyLabelRenderer : undefined}
          hideRoot
          theme={theme}
          invertTheme
          {...restProps}
        />
      )}
    </div>
  );
};

export default JsonTree;
