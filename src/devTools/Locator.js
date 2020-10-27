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

import React, { useState } from "react";
import InputGroup from "react-bootstrap/InputGroup";
import Form from "react-bootstrap/Form";
import { useDebounce } from "use-debounce";
import { DETECT_FRAMEWORK_VERSIONS } from "@/messaging/constants";
import { GridLoader } from "react-spinners";
import Table from "react-bootstrap/Table";
import { useTabInfo, useSearchWindow } from "@/extensionPoints/hooks";

const Locator = () => {
  const [query, setQuery] = useState("");
  const [frameworks] = useTabInfo(DETECT_FRAMEWORK_VERSIONS);
  const [debouncedQuery] = useDebounce(query, 200);
  const [searchResults, searchError] = useSearchWindow(debouncedQuery);

  return (
    <div>
      <div>Welcome to the future of reverse engineering!</div>
      {frameworks && (
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
          onChange={(e) => setQuery(e.target.value)}
          aria-describedby="search-addon"
        />
      </InputGroup>

      {searchError}

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
