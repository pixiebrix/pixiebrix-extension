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

import VendorJSONTree from "react-json-tree";
import { jsonTreeTheme as theme } from "@/themes/light";
import React, { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { searchData } from "@/devTools/editor/tabs/reader/ReaderConfig";
import FieldTemplate from "@/components/form/FieldTemplate";
import { useLabelRenderer } from "@/devTools/editor/tabs/reader/hooks";

export type JsonTreeProps = Partial<VendorJSONTree["props"]> & {
  copyable?: boolean | undefined;
  searchable?: boolean | undefined;
  label?: string | undefined;
};

const JsonTree: React.FunctionComponent<JsonTreeProps> = ({
  copyable = false,
  searchable = false,
  label,
  ...restProps
}) => {
  const { data } = restProps;

  const [query, setQuery] = useState("");

  const [debouncedQuery] = useDebounce(query, 100, { trailing: true });

  const searchResults = useMemo(() => {
    if (debouncedQuery === "" || data == null) {
      return data;
    }

    return searchData(debouncedQuery, data);
  }, [debouncedQuery, data]);

  const copyLabelRenderer = useLabelRenderer();

  const labelRenderer = copyable ? copyLabelRenderer : undefined;

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
    },
    [setQuery]
  );

  return (
    <>
      {searchable && (
        <FieldTemplate
          name="readerSearch"
          label="Search"
          layout="horizontal"
          placeholder="Search for a property or value"
          onChange={onChange}
        />
      )}
      {label ? (
        <span>{query ? `Search Results: ${query}` : label}</span>
      ) : (
        query && <span>{`Search Results: ${query}`}</span>
      )}
      <VendorJSONTree
        data={searchResults}
        labelRenderer={labelRenderer}
        hideRoot
        theme={theme}
        invertTheme
        {...restProps}
      />
    </>
  );
};

export default JsonTree;
