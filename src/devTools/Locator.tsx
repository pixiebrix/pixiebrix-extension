/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useContext, useState } from "react";
import { useAsyncState } from "@/hooks/common";
import InputGroup from "react-bootstrap/InputGroup";
import Form from "react-bootstrap/Form";
import { useDebounce } from "use-debounce";
import GridLoader from "react-spinners/GridLoader";
import Table from "react-bootstrap/Table";
import { searchWindow, detectFrameworks } from "@/background/devtools";
import { browser } from "webextension-polyfill-ts";
import { DevToolsContext } from "@/devTools/context";
import useAsyncEffect from "use-async-effect";
import { isEmpty } from "lodash";

function useSearchWindow(query: string) {
  const { port } = useContext(DevToolsContext);
  const tabId = browser.devtools.inspectedWindow.tabId;
  const [results, setResults] = useState([]);
  const [error, setError] = useState();

  useAsyncEffect(
    async (isMounted) => {
      if (!query) return;
      setError(undefined);
      setResults(undefined);
      try {
        const { results } = await searchWindow(port, query);
        if (!isMounted()) return;
        setResults(results as any);
      } catch (error_) {
        if (!isMounted()) return;
        setError(error_);
      }
    },
    [query, tabId]
  );

  return [results, error];
}

const Locator: React.FunctionComponent = () => {
  const tabId = browser.devtools.inspectedWindow.tabId;
  const { port } = useContext(DevToolsContext);

  const [query, setQuery] = useState("");
  const [frameworks] = useAsyncState(() => detectFrameworks(port), [
    port,
    tabId,
  ]);
  const [debouncedQuery] = useDebounce(query, 200);
  const [searchResults, searchError] = useSearchWindow(debouncedQuery);

  return (
    <div>
      <div>Welcome to the future of reverse engineering!</div>
      {!isEmpty(frameworks) ? (
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
      ) : (
        <span>No front-end frameworks detected</span>
      )}
      <InputGroup className="mb-3">
        <InputGroup.Prepend>
          <InputGroup.Text id="search-addon">*</InputGroup.Text>
        </InputGroup.Prepend>
        <Form.Control
          placeholder="Expression"
          aria-label="Expression"
          defaultValue={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-describedby="search-addon"
        />
      </InputGroup>

      {searchError?.toString()}

      {searchResults != null ? (
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
      ) : (
        <GridLoader />
      )}
    </div>
  );
};

export default Locator;
