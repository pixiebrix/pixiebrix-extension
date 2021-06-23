/*
 * Copyright (C) 2021 Pixie Brix, LLC
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

import React, { useCallback, useContext, useMemo, useState } from "react";
import { FormState } from "@/devTools/editor/editorSlice";
import { useFormikContext } from "formik";
import { Alert, Col, Form, Row } from "react-bootstrap";
import { SchemaTree } from "@/options/pages/extensionEditor/DataSourceCard";
import useAsyncEffect from "use-async-effect";
import GridLoader from "react-spinners/GridLoader";
import { jsonTreeTheme as theme } from "@/themes/light";
import JSONTree from "react-json-tree";
import { useDebounce } from "use-debounce";
import { searchData } from "@/devTools/editor/tabs/reader/ReaderConfig";
import blockRegistry from "@/blocks/registry";
import { useAsyncState } from "@/hooks/common";
import { IReader } from "@/core";
import { runReaderBlock } from "@/background/devtools";
import { DevToolsContext } from "@/devTools/context";
import { useLabelRenderer } from "@/devTools/editor/tabs/reader/hooks";
import { SelectorSelectorControl } from "@/devTools/editor/fields/SelectorSelectorField";
import { faCode, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import copy from "copy-to-clipboard";
import { useToasts } from "react-toast-notifications";

export const ReaderBlockForm: React.FunctionComponent<{
  reader: IReader;
  available: boolean;
  testElement?: boolean;
}> = ({ reader, available, testElement = false }) => {
  const { port } = useContext(DevToolsContext);
  const { addToast } = useToasts();

  const [query, setQuery] = useState("");
  const [testSelector, setTestSelector] = useState<string | null>(null);

  const [{ output, error }, setOutput] = useState({
    output: undefined,
    error: undefined,
  });

  const labelRenderer = useLabelRenderer();

  useAsyncEffect(
    async (isMounted) => {
      if (!reader?.id) {
        return;
      }

      if (!available) {
        setOutput({
          output: {},
          error: "Extension not available on page",
        });
        return;
      }

      setOutput({ output: undefined, error: undefined });

      let output: unknown;

      try {
        output = await runReaderBlock(port, {
          id: reader.id,
          rootSelector: testSelector !== "" ? testSelector : undefined,
        });
        if (!isMounted()) return;
        setOutput({ output, error: undefined });
      } catch (error_) {
        if (!isMounted()) return;
        setOutput({
          output: undefined,
          error: error_.toString(),
        });
      }
    },
    [reader?.id, available, testSelector]
  );

  const [debouncedQuery] = useDebounce(query, 100, { trailing: true });

  const searchResults = useMemo(() => {
    if (debouncedQuery === "" || output == null) {
      return output;
    } else {
      return searchData(query, output);
    }
  }, [debouncedQuery, output]);

  const copyData = useCallback(() => {
    copy(JSON.stringify(searchResults, null, 3));
    addToast("Copied JSON data to clipboard", {
      appearance: "info",
      autoDismiss: true,
    });
  }, [searchResults, addToast]);

  return (
    <div>
      <Alert variant="info">
        {reader.id.startsWith("@pixiebrix") ? (
          <>
            <FontAwesomeIcon icon={faInfoCircle} /> You cannot edit built-in
            readers
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faInfoCircle} /> You cannot edit readers
            created outside the Page Editor
          </>
        )}
      </Alert>
      <Form.Group as={Row} controlId="formReaderId">
        <Form.Label column sm={2}>
          Reader Id
        </Form.Label>
        <Col sm={10}>
          <Form.Control type="text" value={reader.id} disabled={true} />
        </Col>
      </Form.Group>

      {testElement && (
        <Form.Group as={Row} controlId="readerSearch">
          <Form.Label column sm={2}>
            Test Element
          </Form.Label>
          <Col sm={10}>
            <SelectorSelectorControl
              value={testSelector}
              onSelect={(selector) => setTestSelector(selector)}
              isClearable
            />
            <Form.Text>
              Select an element on the page to view sample data for that
              element.
            </Form.Text>
          </Col>
        </Form.Group>
      )}

      <Form.Group as={Row} controlId="readerSearch">
        <Form.Label column sm={2}>
          Search
        </Form.Label>
        <Col sm={10}>
          <Form.Control
            type="text"
            placeholder="Search for a property or value"
            onChange={(e) => setQuery(e.target.value)}
          />
        </Col>
      </Form.Group>
      {error ? (
        <Row className="h-100">
          <Col>
            <span className="text-danger">{error}</span>
          </Col>
        </Row>
      ) : (
        <Row className="h-100">
          <Col md={6} className="ReaderData">
            <div>
              <span>
                {query ? `Search Results: ${query.toLowerCase()}` : "Raw Data"}
              </span>

              <span
                className="ml-2 ReaderData__copy"
                onClick={copyData}
                role="button"
              >
                <FontAwesomeIcon icon={faCode} />
              </span>
            </div>

            <div className="overflow-auto h-100 w-100">
              {available === false && (
                <span className="text-danger">
                  Extension not available on page
                </span>
              )}
              {searchResults !== undefined ? (
                <JSONTree
                  data={searchResults}
                  labelRenderer={labelRenderer}
                  theme={theme}
                  invertTheme
                  hideRoot
                  sortObjectKeys
                />
              ) : (
                <GridLoader />
              )}
            </div>
          </Col>
          <Col md={6} className="ReaderData">
            <span>Schema</span>
            <div className="overflow-auto h-100 w-100">
              <SchemaTree schema={reader?.outputSchema ?? {}} />
            </div>
          </Col>
        </Row>
      )}
    </div>
  );
};

const ReaderBlockConfig: React.FunctionComponent<{
  readerIndex: number;
  available: boolean;
  testElement: boolean;
}> = ({ readerIndex, available, testElement = false }) => {
  const { values } = useFormikContext<FormState>();

  const [readerBlock] = useAsyncState(async () => {
    // eslint-disable-next-line security/detect-object-injection -- readerIndex is a number
    const reader = values.readers[readerIndex];

    // OK to return the promise directly
    // noinspection ES6MissingAwait
    return blockRegistry.lookup(reader.metadata.id) as Promise<IReader>;
  }, [readerIndex, values.readers]);

  if (!readerBlock) {
    return <GridLoader />;
  }

  return (
    <ReaderBlockForm
      reader={readerBlock}
      available={available}
      testElement={testElement}
    />
  );
};

export default ReaderBlockConfig;
