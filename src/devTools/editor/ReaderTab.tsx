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
import { ButtonState } from "@/devTools/editor/editorSlice";
import { PayloadAction } from "@reduxjs/toolkit";
import { DevToolsContext } from "@/devTools/context";
import { useField, useFormikContext } from "formik";
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

// @ts-ignore: no type definitions?
import GenerateSchema from "generate-schema";

type FrameworkOption = {
  value: Framework;
  label: string;
  detected?: FrameworkMeta;
  makeConfig?: (type: string, selector: string) => ReaderTypeConfig;
};

export function defaultConfig(
  type: string,
  selector: string
): ReaderTypeConfig {
  return { type, selector };
}

export const readerOptions: FrameworkOption[] = [
  { value: "react", label: "React" },
  { value: "angular", label: "Angular" },
  {
    value: "angularjs",
    label: "AngularJS",
    makeConfig: (type: string, selector) => ({
      type: "angular",
      selector: selector,
    }),
  },
  { value: "emberjs", label: "Ember.js" },
  { value: "vue", label: "Vue.js" },
  {
    value: "jquery",
    label: "jQuery",
    makeConfig: (type: string, selector) => ({
      type: "jquery",
      selectors: [selector],
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
          label: `${option.label} - ${
            detected ? detected.version ?? "Unknown Version" : "Not detected"
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

const ReaderTab: React.FunctionComponent<{
  element: ButtonState;
  dispatch: (action: PayloadAction<unknown>) => void;
}> = ({ element }) => {
  const { port, frameworks } = useContext(DevToolsContext);
  const { values, setFieldValue } = useFormikContext<ButtonState>();
  const [{ output, schema, error }, setSchema] = useState({
    output: undefined,
    schema: undefined,
    error: undefined,
  });

  useAsyncEffect(
    async (isMounted) => {
      setSchema({ output: undefined, schema: undefined, error: undefined });
      const option = readerOptions.find((x) => x.value === values.reader.type);
      let output;
      let schema;
      try {
        output = await runReader(port, {
          config: (option.makeConfig ?? defaultConfig)(
            values.reader.type,
            values.reader.selector
          ),
        });
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
    [values.reader?.type, values.reader?.selector]
  );

  return (
    <Tab.Pane eventKey="reader">
      <Form.Group as={Row} controlId="readerType">
        <Form.Label column sm={2}>
          Framework
        </Form.Label>
        <Col sm={10}>
          <FrameworkSelector name="reader.type" frameworks={frameworks} />
        </Col>
      </Form.Group>
      <Form.Group as={Row} controlId="readerSelector">
        <Form.Label column sm={2}>
          Selector
        </Form.Label>
        <Col sm={10}>
          <SelectorSelectorField
            name="reader.selector"
            initialElement={element.containerInfo}
          />
        </Col>
      </Form.Group>
      <Row>
        {error ? (
          <Col>{error}</Col>
        ) : (
          <>
            <Col className="h-100">
              <span>Raw Data</span>
              <div className="overflow-auto h-100">
                {output !== undefined ? (
                  <JSONTree data={output} theme={theme} invertTheme hideRoot />
                ) : (
                  <GridLoader />
                )}
              </div>
            </Col>
            <Col className="h-100">
              <span>Inferred Schema</span>
              <div className="overflow-auto h-100">
                {schema !== undefined ? (
                  <SchemaTree schema={schema} />
                ) : (
                  <GridLoader />
                )}
              </div>
            </Col>
          </>
        )}
      </Row>
    </Tab.Pane>
  );
};

export default ReaderTab;
