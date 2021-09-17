/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

/* eslint-disable security/detect-object-injection */
import { useField, useFormikContext } from "formik";
import React, { useEffect } from "react";
import { RJSFSchema, SetActiveField } from "./formBuilderTypes";
import { Button, Form as BootstrapForm } from "react-bootstrap";
import FieldEditor from "./FieldEditor";
import {
  DEFAULT_FIELD_TYPE,
  generateNewPropertyName,
  moveStringInArray,
  replaceStringInArray,
} from "./formBuilderHelpers";
import { UI_ORDER } from "./schemaFieldNames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faArrowUp,
  faPlus,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { Schema, UiSchema } from "@/core";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";

const FormEditor: React.FC<{
  name: string;
  activeField?: string;
  setActiveField: SetActiveField;
}> = ({ name, activeField, setActiveField }) => {
  const { setFieldValue } = useFormikContext<RJSFSchema>();
  const [{ value: schema }] = useField<Schema>(`${name}.schema`);
  const [{ value: uiSchema }] = useField<UiSchema>(`${name}.uiSchema`);

  const uiOrder = uiSchema[UI_ORDER];

  useEffect(() => {
    // Set uiSchema order if needed
    if (!uiOrder) {
      const propertyKeys = Object.keys(schema.properties || {});
      const nextUiOrder = [...propertyKeys, "*"];
      setFieldValue(`${name}.uiSchema.${UI_ORDER}`, nextUiOrder);
    }
  }, [name, schema, uiOrder, setFieldValue]);

  const addProperty = () => {
    const propertyName = generateNewPropertyName(
      Object.keys(schema.properties || {})
    );
    const newProperty = {
      name: propertyName,
      title: propertyName,
      type: DEFAULT_FIELD_TYPE,
    };
    const nextUiOrder = activeField
      ? replaceStringInArray(uiOrder, activeField, activeField, propertyName)
      : replaceStringInArray(uiOrder, "*", propertyName, "*");

    setFieldValue(`${name}.uiSchema.${UI_ORDER}`, nextUiOrder);
    setFieldValue(`${name}.schema.properties.${propertyName}`, newProperty);
    setActiveField(propertyName);
  };

  const moveProperty = (direction: "up" | "down") => {
    const nextUiOrder = moveStringInArray(uiOrder, activeField, direction);
    setFieldValue(`${name}.uiSchema.${UI_ORDER}`, nextUiOrder);
  };

  const removeProperty = () => {
    const propertyToRemove = activeField;
    const nextUiOrder = replaceStringInArray(uiOrder, propertyToRemove);
    const nextActiveField = nextUiOrder[0];

    setActiveField(nextActiveField);
    if (schema.required?.length > 0) {
      const nextRequired = replaceStringInArray(
        schema.required,
        propertyToRemove
      );
      setFieldValue(`${name}.schema.required`, nextRequired);
    }

    setFieldValue(`${name}.uiSchema.${UI_ORDER}`, nextUiOrder);
    // eslint-disable-next-line unicorn/no-useless-undefined -- required for Formik to remove the field
    setFieldValue(`${name}.schema.properties.${propertyToRemove}`, undefined);
    // eslint-disable-next-line unicorn/no-useless-undefined -- required for Formik to remove the field
    setFieldValue(`${name}.uiSchema.${propertyToRemove}`, undefined);
  };

  // There's always at least 1 item in uiOrder array, "*".
  const propertyNameToShow =
    activeField || (uiOrder?.length > 1 && uiOrder?.[0]);
  const canMoveUp = uiOrder?.length > 2 && uiOrder[0] !== activeField;
  const canMoveDown =
    uiOrder?.length > 2 && uiOrder[uiOrder.length - 2] !== activeField;

  return (
    <div>
      <BootstrapForm.Group>
        <h5>Edit form</h5>
        <hr />
      </BootstrapForm.Group>
      <ConnectedFieldTemplate name={`${name}.schema.title`} label="Title" />
      <ConnectedFieldTemplate
        name={`${name}.schema.description`}
        label="Description"
      />
      <BootstrapForm.Group>
        <h6>Edit fields</h6>
        <hr />
      </BootstrapForm.Group>
      {propertyNameToShow && Boolean(schema.properties[propertyNameToShow]) && (
        <FieldEditor
          name={name}
          propertyName={propertyNameToShow}
          setActiveField={setActiveField}
        />
      )}

      <Button onClick={addProperty} variant="success" size="sm">
        <FontAwesomeIcon icon={faPlus} />
      </Button>
      <Button
        onClick={() => {
          moveProperty("up");
        }}
        disabled={!canMoveUp}
        variant="light"
        size="sm"
      >
        <FontAwesomeIcon icon={faArrowUp} />
      </Button>
      <Button
        onClick={() => {
          moveProperty("down");
        }}
        disabled={!canMoveDown}
        variant="light"
        size="sm"
      >
        <FontAwesomeIcon icon={faArrowDown} />
      </Button>
      <Button onClick={removeProperty} variant="danger" size="sm">
        <FontAwesomeIcon icon={faTimes} />
      </Button>
    </div>
  );
};

export default FormEditor;
