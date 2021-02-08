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

import React, { useContext, useMemo, useState } from "react";
import {
  FormState,
  isCustomReader,
  ReaderReferenceFormState,
} from "@/devTools/editor/editorSlice";
import { Field, FieldInputProps, useFormikContext } from "formik";
import { Alert, Col, Form, Row } from "react-bootstrap";
import { SchemaTree } from "@/options/pages/extensionEditor/DataSourceCard";
import useAsyncEffect from "use-async-effect";
import { GridLoader } from "react-spinners";
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

const ReaderBlockConfig: React.FunctionComponent<{
  readerIndex: number;
  available: boolean;
}> = ({ readerIndex, available }) => {
  const { port } = useContext(DevToolsContext);
  const [query, setQuery] = useState("");
  const { values } = useFormikContext<FormState>();

  const reader: ReaderReferenceFormState = useMemo(() => {
    // only passing number in
    // eslint-disable-next-line security/detect-object-injection
    const reader = values.readers[readerIndex];
    if (isCustomReader(reader)) {
      throw new Error("Expecting pre-existing reader");
    }
    return reader;
  }, [readerIndex, values.readers]);

  const [readerBlock] = useAsyncState(async () => {
    // readerIndex is a number
    // eslint-disable-next-line security/detect-object-injection
    const reader = values.readers[readerIndex];
    return (await blockRegistry.lookup(reader.metadata.id)) as IReader;
  }, [readerIndex, values.readers]);

  const baseName = `readers[${readerIndex}]`;

  const [{ output }, setOutput] = useState({
    output: undefined,
    error: undefined,
  });

  const locked = true;

  const labelRenderer = useLabelRenderer();

  useAsyncEffect(
    async (isMounted) => {
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
        output = await runReaderBlock(port, { id: reader.metadata.id });
        if (!isMounted()) return;
        setOutput({ output, error: undefined });
      } catch (exc) {
        if (!isMounted()) return;
        setOutput({
          output: undefined,
          error: exc.toString(),
        });
      }
    },
    [reader?.metadata.id, available, locked]
  );

  const [debouncedQuery] = useDebounce(query, 100, { trailing: true });

  const searchResults = useMemo(() => {
    if (debouncedQuery === "" || output == null) {
      return output;
    } else {
      return searchData(query, output);
    }
  }, [debouncedQuery, output]);

  return (
    <div>
      <Alert variant="info">
        You cannot edit readers created outside the Page Editor
      </Alert>
      <Form.Group as={Row} controlId="formReaderId">
        <Form.Label column sm={2}>
          Reader Id
        </Form.Label>
        <Col sm={10}>
          <Field name={`${baseName}.metadata.id`}>
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control type="text" {...field} disabled={true} />
            )}
          </Field>
        </Col>
      </Form.Group>

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

      <Row className="h-100">
        <Col md={6} className="ReaderData">
          <span>
            {query ? `Search Results: ${query.toLowerCase()}` : "Raw Data"}
          </span>
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
            <SchemaTree schema={readerBlock?.outputSchema ?? {}} />
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default ReaderBlockConfig;
