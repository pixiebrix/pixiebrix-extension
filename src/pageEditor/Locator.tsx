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

import React, { useState } from "react";
import { useAsyncState } from "@/hooks/common";
import { InputGroup, Form, Table } from "react-bootstrap";
import { useDebounce } from "use-debounce";
import Loader from "@/components/Loader";
import { useAsyncEffect } from "use-async-effect";
import { isEmpty } from "lodash";
import { thisTab } from "@/pageEditor/utils";
import { detectFrameworks, searchWindow } from "@/contentScript/messenger/api";
import { getErrorMessage } from "@/errors";

function useSearchWindow(query: string): [unknown[] | null, unknown | null] {
  const { tabId } = browser.devtools.inspectedWindow;
  const [results, setResults] = useState<unknown[] | null>([]);
  const [error, setError] = useState<unknown | null>();

  useAsyncEffect(
    async (isMounted) => {
      if (!query) return;
      setError(null);
      setResults(null);
      try {
        const { results } = await searchWindow(thisTab, query);
        if (!isMounted()) return;
        setResults(results);
      } catch (error) {
        if (!isMounted()) return;
        setError(error);
      }
    },
    [query, tabId]
  );

  return [results, error];
}

const Locator: React.FunctionComponent = () => {
  const [query, setQuery] = useState("");
  const [frameworks] = useAsyncState(
    async () => detectFrameworks(thisTab, null),
    []
  );
  const [debouncedQuery] = useDebounce(query, 200);
  const [searchResults, searchError] = useSearchWindow(debouncedQuery);

  return (
    <div>
      <div>Welcome to the future of reverse engineering!</div>
      {isEmpty(frameworks) ? (
        <span>No front-end frameworks detected</span>
      ) : (
        <>
          Frameworks Detected
          <ul>
            {Object.entries(frameworks).map(([framework, version]) => (
              <li key={framework}>
                {framework}: {version}
              </li>
            ))}
          </ul>
        </>
      )}
      <InputGroup className="mb-3">
        <InputGroup.Prepend>
          <InputGroup.Text id="search-addon">*</InputGroup.Text>
        </InputGroup.Prepend>
        <Form.Control
          placeholder="Expression"
          aria-label="Expression"
          defaultValue={query}
          onChange={({ target }) => {
            setQuery(target.value);
          }}
          aria-describedby="search-addon"
        />
      </InputGroup>

      {searchError && getErrorMessage(searchError)}

      {searchResults == null ? (
        <Loader />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Path</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {searchResults.map(({ path, value }) => (
              <tr key={path}>
                <td>{path}</td>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default Locator;
