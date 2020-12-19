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

import React, { useContext, useMemo, useState } from "react";
import { FormState } from "@/devTools/editor/editorSlice";
import { DevToolsContext } from "@/devTools/context";
import { compact, isEmpty, mapValues, partial, pick, pickBy } from "lodash";
import { Field, FieldInputProps, useField, useFormikContext } from "formik";
import { Col, Form, Row, Tab } from "react-bootstrap";
import Select from "react-select";
import { Framework, FrameworkMeta } from "@/messaging/constants";
import SelectorSelectorField from "@/devTools/editor/SelectorSelectorField";
import { SchemaTree } from "@/options/pages/extensionEditor/DataSourceCard";
import useAsyncEffect from "use-async-effect";
import { GridLoader } from "react-spinners";
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
import devtoolFields from "@/devTools/editor/Fields";

// @ts-ignore: no type definitions?
import GenerateSchema from "generate-schema";

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
  ["type", "selector", "traverseUp"]
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
}> = ({ name, frameworks }) => {
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

function searchData(query: string, data: unknown): unknown {
  const normalized = normalize(query);
  if (data == null) {
    return null;
  } else if (typeof data === "object") {
    const values = mapValues(data, (value, key) =>
      normalize(key).includes(query) ? value : searchData(query, value)
    );
    return pickBy(values, (value, key) => {
      const keyMatch = normalize(key).includes(query);
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
  element: FormState;
}> = ({ element }) => {
  return (
    <>
      <Form.Group as={Row} controlId="readerSelector">
        <Form.Label column sm={2}>
          Selector
        </Form.Label>
        <Col sm={10}>
          <SelectorSelectorField
            isClearable
            name="reader.definition.selector"
            initialElement={
              "containerInfo" in element ? element.containerInfo : null
            }
            traverseUp={5}
          />
        </Col>
      </Form.Group>
      <Form.Group as={Row} controlId="readerTraverseUp">
        <Form.Label column sm={2}>
          Traverse Up
        </Form.Label>
        <Col sm={10}>
          <Field name="reader.definition.traverseUp">
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
  element: FormState;
}> = () => {
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
        <Field name="reader.definition.selectors" schema={schema} />
      </Col>
    </Form.Group>
  );
};

const ReaderTab: React.FunctionComponent<{
  eventKey?: string;
}> = ({ eventKey = "reader" }) => {
  const { port, frameworks } = useContext(DevToolsContext);
  const [query, setQuery] = useState("");
  const { values, setFieldValue } = useFormikContext<FormState>();
  const [{ output, schema, error }, setSchema] = useState({
    output: undefined,
    schema: undefined,
    error: undefined,
  });

  useAsyncEffect(
    async (isMounted) => {
      setSchema({ output: undefined, schema: undefined, error: undefined });
      const { type, selector } = values.reader?.definition ?? {};
      if (type !== "jquery" && !selector) {
        return;
      }
      const option = readerOptions.find((x) => x.value === type);
      let output;
      let schema;
      try {
        const config = (option.makeConfig ?? defaultSelector)(
          values.reader.definition
        );
        output = await runReader(port, { config });
        schema = GenerateSchema.json("Inferred Schema", output);
      } catch (exc) {
        if (!isMounted()) return;
        setSchema({
          output: undefined,
          schema: undefined,
          error: exc.toString(),
        });
        return;
      }

      if (!isMounted()) return;
      setFieldValue("reader.outputSchema", schema);
      setSchema({ output, schema, error: undefined });
    },
    [values.reader?.definition]
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
    <Tab.Pane eventKey={eventKey} className="h-100">
      <RendererContext.Provider value={devtoolFields}>
        <Form.Group as={Row} controlId="formReaderId">
          <Form.Label column sm={2}>
            Reader Id
          </Form.Label>
          <Col sm={10}>
            <Field name="reader.metadata.id">
              {({ field }: { field: FieldInputProps<string> }) => (
                <Form.Control type="text" {...field} />
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
              name="reader.definition.type"
              frameworks={frameworks}
            />
          </Col>
        </Form.Group>

        {values.reader.definition.type === "jquery" ? (
          <JQueryFields element={values} />
        ) : (
          <FrameworkFields element={values} />
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
        {error || !values.reader?.definition?.selector ? (
          <Row className="h-100">
            <Col>{error ?? "No reader/selector selected"}</Col>
          </Row>
        ) : (
          <Row className="h-100">
            <Col md={6} className="ReaderData">
              <span>
                {query ? `Search Results: ${query.toLowerCase()}` : "Raw Data"}
              </span>
              <div className="overflow-auto h-100 w-100">
                {searchResults !== undefined ? (
                  <JSONTree
                    data={searchResults}
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
    </Tab.Pane>
  );
};

export default ReaderTab;
