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
import { FrameworkVersions } from "@/messaging/constants";
import SelectorSelectorField from "@/devTools/editor/SelectorSelectorField";
import { SchemaTree } from "@/options/pages/extensionEditor/DataSourceCard";
import useAsyncEffect from "use-async-effect";
import { GridLoader } from "react-spinners";
import { runReader } from "@/background/devtools";
import { jsonTreeTheme as theme } from "@/themes/light";

// @ts-ignore: no type definitions?
import GenerateSchema from "generate-schema";
import JSONTree from "react-json-tree";

type FrameworkOption = { value: keyof FrameworkVersions; label: string };

const readerOptions: FrameworkOption[] = [
  { value: "react", label: "React - Props" },
  { value: "angular", label: "Angular - Scope" },
  { value: "emberjs", label: "Ember.js" },
  { value: "vuejs", label: "Vue.js" },
];

const FrameworkSelector: React.FunctionComponent<{
  name: string;
  frameworks: FrameworkVersions;
}> = ({ name, frameworks }) => {
  const frameworkOptions = useMemo(() => {
    return readerOptions;
    // return readerOptions.filter(x => frameworks[x.value]);
  }, [frameworks]);
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
}> = ({ element, dispatch }) => {
  const { port, frameworks } = useContext(DevToolsContext);
  const { values } = useFormikContext<ButtonState>();
  const [{ output, schema }, setSchema] = useState({
    output: undefined,
    schema: undefined,
  });

  useAsyncEffect(
    async (isMounted) => {
      setSchema({ output: undefined, schema: undefined });
      const output = await runReader(port, {
        config: { type: values.reader.type, selector: values.reader.selector },
      });
      const schema = GenerateSchema.json("Inferred Schema", output);
      if (!isMounted()) return;
      setSchema({ output, schema });
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
            suggestions={[element.containerSelector]}
          />
        </Col>
      </Form.Group>
      <Row>
        <Col>
          <span>Raw Data</span>
          {output !== undefined ? (
            <JSONTree data={output} theme={theme} invertTheme hideRoot />
          ) : (
            <GridLoader />
          )}
        </Col>
        <Col>
          <span>Inferred Schema</span>
          {schema !== undefined ? (
            <SchemaTree schema={schema} />
          ) : (
            <GridLoader />
          )}
        </Col>
      </Row>
    </Tab.Pane>
  );
};

export default ReaderTab;
