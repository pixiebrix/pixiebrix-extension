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
import { FormState, isCustomReader } from "@/devTools/editor/editorSlice";
import { DevToolsContext } from "@/devTools/context";
import { compact, isEmpty, mapValues, partial, pick, pickBy } from "lodash";
import { Field, FieldInputProps, useField, useFormikContext } from "formik";
import { Alert, Col, Form, Row } from "react-bootstrap";
import Select from "react-select";
import { Framework, FrameworkMeta } from "@/messaging/constants";
import SelectorSelectorField from "@/devTools/editor/fields/SelectorSelectorField";
import { SchemaTree } from "@/options/pages/extensionEditor/DataSourceCard";
import useAsyncEffect from "use-async-effect";
import GridLoader from "react-spinners/GridLoader";
import { runReader } from "@/background/devtools";
import { jsonTreeTheme as theme } from "@/themes/light";
import JSONTree from "react-json-tree";
import { ReaderTypeConfig } from "@/blocks/readers/factory";
import { useDebounce } from "use-debounce";
import { Schema } from "@/core";
import {
  getDefaultField,
  RendererContext,
} from "@/components/fields/blockOptions";
import devtoolFields from "@/devTools/editor/fields/Fields";
// @ts-ignore: no type definitions?
import GenerateSchema from "generate-schema";
import { useLabelRenderer } from "@/devTools/editor/tabs/reader/hooks";
import ToggleField from "@/devTools/editor/components/ToggleField";

type ReaderSelector = (options: {
  type: string;
  [prop: string]: unknown;
}) => ReaderTypeConfig;

type FrameworkOption = {
  value: Framework;
  label: string;
  detected?: FrameworkMeta;
  makeConfig?: ReaderSelector;
};

export const defaultSelector: ReaderSelector = partial(
  pick,
  partial.placeholder,
  ["type", "selector", "traverseUp", "optional"]
) as ReaderSelector;

export const readerOptions: FrameworkOption[] = [
  { value: "react", label: "React" },
  {
    value: "angularjs",
    label: "AngularJS",
  },
  { value: "emberjs", label: "Ember.js" },
  {
    value: "vue",
    label: "Vue.js",
    makeConfig: (options) => ({
      ...options,
      type: "vuejs",
    }),
  },
  {
    value: "jquery",
    label: "jQuery",
    makeConfig: ({ type, selectors }) => ({
      type,
      selectors,
    }),
  },
];

const FrameworkSelector: React.FunctionComponent<{
  name: string;
  frameworks: FrameworkMeta[];
}> = ({ name, frameworks = [] }) => {
  // console.debug("Frameworks", { frameworks });

  const frameworkOptions: FrameworkOption[] = useMemo(
    () =>
      readerOptions.map((option) => {
        const detected = frameworks.find(({ id }) => option.value === id);
        return {
          ...option,
          detected,
          label:
            option.value === "jquery"
              ? option.label
              : `${option.label} - ${
                  detected
                    ? detected.version ?? "Unknown Version"
                    : "Not detected"
                }`,
        };
      }),
    [frameworks]
  );
  const [field, , helpers] = useField(name);
  return (
    <Select
      options={frameworkOptions}
      value={frameworkOptions.find((x) => x.value === field.value)}
      onChange={(option: FrameworkOption) => helpers.setValue(option.value)}
    />
  );
};

function normalize(value: unknown): string {
  return value.toString().toLowerCase();
}

export function searchData(query: string, data: unknown): unknown {
  const normalized = normalize(query);
  if (data == null) {
    return null;
  } else if (typeof data === "object") {
    const values = mapValues(data, (value, key) =>
      normalize(key).includes(query) ? value : searchData(query, value)
    );
    return pickBy(values, (value, key) => {
      const keyMatch = normalize(key).includes(normalized);
      const valueMatch =
        typeof value === "object" || Array.isArray(value)
          ? !isEmpty(value)
          : value != null;
      return keyMatch || valueMatch;
    });
  } else if (Array.isArray(data)) {
    return compact(data.map(partial(searchData, query)));
  }
  return normalize(data).includes(normalized) ? data : undefined;
}

const FrameworkFields: React.FunctionComponent<{
  name: string;
  element: FormState;
}> = ({ element, name }) => {
  return (
    <>
      <Form.Group as={Row} controlId="readerSelector">
        <Form.Label column sm={2}>
          Selector
        </Form.Label>
        <Col sm={10}>
          <SelectorSelectorField
            isClearable
            name={`${name}.definition.selector`}
            initialElement={
              "containerInfo" in element ? element.containerInfo : null
            }
            traverseUp={5}
          />
        </Col>
      </Form.Group>
      <Form.Group as={Row} controlId="readerOptional">
        <Form.Label column sm={2}>
          Optional
        </Form.Label>
        <Col sm={10}>
          <ToggleField name={`${name}.definition.optional`} />
          <Form.Text className="text-muted">
            Toggle on if the selector might not always be available
          </Form.Text>
        </Col>
      </Form.Group>
      <Form.Group as={Row} controlId="readerTraverseUp">
        <Form.Label column sm={2}>
          Traverse Up
        </Form.Label>
        <Col sm={10}>
          <Field name={`${name}.definition.traverseUp`}>
            {({ field }: { field: FieldInputProps<number> }) => (
              <Form.Control type="number" {...field} min={0} max={10} />
            )}
          </Field>
          <Form.Text className="text-muted">
            Traverse non-visible framework elements
          </Form.Text>
        </Col>
      </Form.Group>
    </>
  );
};

const JQueryFields: React.FunctionComponent<{
  name: string;
  element: FormState;
}> = ({ name }) => {
  const schema: Schema = {
    type: "object",
    additionalProperties: {
      type: "string",
      format: "selector",
    },
  };

  const Field = useMemo(() => getDefaultField(schema), []);

  return (
    <Form.Group as={Row} controlId="readerSelector">
      <Form.Label column sm={2}>
        Selectors
      </Form.Label>
      <Col sm={10}>
        <Field name={`${name}.definition.selectors`} schema={schema} />
      </Col>
    </Form.Group>
  );
};

const ReaderConfig: React.FunctionComponent<{
  readerIndex: number;
  editable: Set<string>;
  available: boolean;
}> = ({ readerIndex, editable, available }) => {
  const {
    port,
    tabState: { meta },
  } = useContext(DevToolsContext);
  const baseName = `readers[${readerIndex}]`;
  const [query, setQuery] = useState("");
  const { values, setFieldValue } = useFormikContext<FormState>();

  // console.debug("reader form state", { readerIndex, readers: values.readers });

  const [{ output, schema, error }, setSchema] = useState({
    output: undefined,
    schema: undefined,
    error: undefined,
  });

  // only passing number in
  // eslint-disable-next-line security/detect-object-injection
  const reader = values.readers[readerIndex];

  if (!isCustomReader(reader)) {
    throw new Error("Expecting custom reader");
  }

  const locked = useMemo(
    () => values.installed && !editable?.has(reader.metadata.id),
    [editable, values.installed, reader.metadata.id]
  );

  const labelRenderer = useLabelRenderer();

  useAsyncEffect(
    async (isMounted) => {
      if (!available) {
        setSchema({
          output: {},
          schema: undefined,
          error: "Extension not available on page",
        });
        return;
      }

      setSchema({ output: undefined, schema: undefined, error: undefined });
      const { type, selector } = reader?.definition ?? {};
      if (type !== "jquery" && !selector) {
        setSchema({
          output: {},
          schema: undefined,
          error: "No selector specified",
        });
        return;
      }
      const option = readerOptions.find((x) => x.value === type);
      let output;
      let schema;
      try {
        const config = (option.makeConfig ?? defaultSelector)(
          reader.definition
        );
        output = await runReader(port, { config });
        schema = GenerateSchema.json("Inferred Schema", output);
      } catch (error_) {
        if (!isMounted()) return;
        setSchema({
          output: undefined,
          schema: undefined,
          error: error_.toString(),
        });
        return;
      }

      if (!isMounted()) {
        return;
      }

      if (!locked) {
        setFieldValue(`${baseName}.outputSchema`, schema);
      }

      setSchema({ output, schema, error: undefined });
    },
    [port, reader?.definition, available, locked, setFieldValue, setSchema]
  );

  const [debouncedQuery] = useDebounce(query, 100, { trailing: true });

  const searchResults = useMemo(() => {
    if (debouncedQuery === "" || output == null) {
      return output;
    } else {
      return searchData(query, output);
    }
  }, [debouncedQuery, output]);

  if (locked) {
    return (
      <div>
        <Alert variant="info">
          You do not have edit permissions for this reader
        </Alert>

        <Form.Group as={Row} controlId="formReaderId">
          <Form.Label column sm={2}>
            Name
          </Form.Label>
          <Col sm={10}>
            <Field name={`${baseName}.metadata.name`}>
              {({ field }: { field: FieldInputProps<string> }) => (
                <Form.Control
                  type="text"
                  {...field}
                  disabled={values.installed}
                />
              )}
            </Field>
          </Col>
        </Form.Group>

        <Form.Group as={Row} controlId="formReaderId">
          <Form.Label column sm={2}>
            Reader Id
          </Form.Label>
          <Col sm={10}>
            <Field name={`${baseName}.metadata.id`}>
              {({ field }: { field: FieldInputProps<string> }) => (
                <Form.Control
                  type="text"
                  {...field}
                  disabled={values.installed}
                />
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
              <SchemaTree schema={reader.outputSchema} />
            </div>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div className="h-100">
      <RendererContext.Provider value={devtoolFields}>
        <Form.Group as={Row} controlId="formReaderId">
          <Form.Label column sm={2}>
            Name
          </Form.Label>
          <Col sm={10}>
            <Field name={`${baseName}.metadata.name`}>
              {({ field }: { field: FieldInputProps<string> }) => (
                <Form.Control
                  type="text"
                  {...field}
                  disabled={values.installed && !reader._new}
                />
              )}
            </Field>
          </Col>
        </Form.Group>

        <Form.Group as={Row} controlId="formReaderId">
          <Form.Label column sm={2}>
            Reader Id
          </Form.Label>
          <Col sm={10}>
            <Field name={`${baseName}.metadata.id`}>
              {({ field }: { field: FieldInputProps<string> }) => (
                <Form.Control
                  type="text"
                  {...field}
                  disabled={values.installed && !reader._new}
                />
              )}
            </Field>
          </Col>
        </Form.Group>

        <Form.Group as={Row} controlId="readerType">
          <Form.Label column sm={2}>
            Framework
          </Form.Label>
          <Col sm={10}>
            <FrameworkSelector
              name={`${baseName}.definition.type`}
              frameworks={meta?.frameworks ?? []}
            />
          </Col>
        </Form.Group>

        {reader.definition.type === "jquery" ? (
          <JQueryFields element={values} name={baseName} />
        ) : (
          <FrameworkFields element={values} name={baseName} />
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
              <span>Inferred Schema</span>
              <div className="overflow-auto h-100 w-100">
                {schema !== undefined ? (
                  <SchemaTree schema={schema} />
                ) : (
                  <GridLoader />
                )}
              </div>
            </Col>
          </Row>
        )}
      </RendererContext.Provider>
    </div>
  );
};

export default ReaderConfig;
