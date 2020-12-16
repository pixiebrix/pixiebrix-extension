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

import React, { useMemo, useState } from "react";
import { FormState } from "@/devTools/editor/editorSlice";
import { PayloadAction } from "@reduxjs/toolkit";
import { Tab } from "react-bootstrap";
import { actionSchema } from "@/extensionPoints/menuItemExtension";
import { defaultFieldRenderer } from "@/options/pages/extensionEditor/fieldRenderer";
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import useAsyncEffect from "use-async-effect";
import { GridLoader } from "react-spinners";

import "@/blocks/effects";
import "@/blocks/readers";
import "@/blocks/renderers";
import {
  IRenderContext,
  RendererContext,
} from "@/components/fields/blockOptions";
import { Schema } from "@/core";
import SelectorSelectorField from "@/devTools/editor/SelectorSelectorField";
import { FieldProps } from "@/components/fields/propTypes";
import { useField } from "formik";
import Form from "react-bootstrap/Form";
import { fieldLabel } from "@/components/fields/fieldUtils";

const SelectorWrapper: React.FunctionComponent<FieldProps<string>> = ({
  label,
  schema,
  ...props
}) => {
  const [field, meta] = useField(props);
  return (
    <Form.Group>
      <Form.Label>{label ?? fieldLabel(field.name)}</Form.Label>
      <SelectorSelectorField isClearable sort name={field.name} />
      {schema.description && (
        <Form.Text className="text-muted">{schema.description}</Form.Text>
      )}
      {meta.touched && meta.error && (
        <Form.Control.Feedback type="invalid">
          {meta.error}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
};

const devtoolFields: IRenderContext = {
  customRenderers: [
    {
      match: (fieldSchema: Schema) =>
        fieldSchema.type === "string" && fieldSchema.format === "selector",
      Component: SelectorWrapper,
    },
  ],
};

const EffectTab: React.FunctionComponent<{
  eventKey?: string;
  element: FormState;
  dispatch: (action: PayloadAction<unknown>) => void;
}> = ({ eventKey }) => {
  const [loaded, setLoaded] = useState(false);

  useAsyncEffect(async () => {
    await blockRegistry.fetch();
    setLoaded(true);
  }, []);

  const [blocks] = useAsyncState(blockRegistry.all(), [loaded]);
  const Field = useMemo(() => defaultFieldRenderer(actionSchema), [blocks]);

  return (
    <Tab.Pane eventKey={eventKey} className="h-100">
      <RendererContext.Provider value={devtoolFields}>
        {loaded && blocks?.length ? (
          <Field
            name="extension.action"
            schema={actionSchema}
            // @ts-ignore: need to type field props to allow extra types
            blocks={blocks}
          />
        ) : (
          <GridLoader />
        )}
      </RendererContext.Provider>
    </Tab.Pane>
  );
};

export default EffectTab;
