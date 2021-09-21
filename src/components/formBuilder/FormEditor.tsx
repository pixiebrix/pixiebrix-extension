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
import { useField } from "formik";
import React, { useEffect } from "react";
import { RJSFSchema, SetActiveField } from "./formBuilderTypes";
import { Button, Form as BootstrapForm } from "react-bootstrap";
import FieldEditor from "./FieldEditor";
import {
  DEFAULT_FIELD_TYPE,
  generateNewPropertyName,
  MINIMAL_SCHEMA,
  MINIMAL_UI_SCHEMA,
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
import { Schema } from "@/core";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { produce } from "immer";

const FormEditor: React.FC<{
  name: string;
  activeField?: string;
  setActiveField: SetActiveField;
}> = ({ name, activeField, setActiveField }) => {
  const [
    { value: rjsfSchema },
    ,
    { setValue: setRjsfSchema },
  ] = useField<RJSFSchema>(name);
  const [{ value: uiOrder }, , { setValue: setUiOrder }] = useField<string[]>(
    `${name}.uiSchema.${UI_ORDER}`
  );

  const { schema, uiSchema } = rjsfSchema;

  useEffect(() => {
    // Set default values if needed
    if (!schema || !uiSchema || !uiOrder?.includes("*")) {
      const nextRjsfSchema = produce(rjsfSchema, (draft) => {
        if (!draft.schema) {
          draft.schema = MINIMAL_SCHEMA;
        }

        if (!draft.uiSchema) {
          draft.uiSchema = MINIMAL_UI_SCHEMA;
        }

        if (!draft.uiSchema[UI_ORDER]) {
          const propertyKeys = Object.keys(draft.schema.properties || {});
          draft.uiSchema[UI_ORDER] = [...propertyKeys, "*"];
        } else if (!draft.uiSchema[UI_ORDER].includes("*")) {
          draft.uiSchema[UI_ORDER].push("*");
        }
      });
      setRjsfSchema(nextRjsfSchema);
    }
  }, [rjsfSchema, schema, uiSchema, uiOrder, setRjsfSchema]);

  if (!schema || !uiSchema) {
    return null;
  }

  const addProperty = () => {
    const propertyName = generateNewPropertyName(
      Object.keys(schema.properties || {})
    );
    const newProperty: Schema = {
      // @ts-expect-error -- name is valid in a property definition
      name: propertyName,
      title: propertyName,
      type: DEFAULT_FIELD_TYPE,
    };
    const nextUiOrder = activeField
      ? replaceStringInArray(uiOrder, activeField, activeField, propertyName)
      : replaceStringInArray(uiOrder, "*", propertyName, "*");

    const nextRjsfSchema = produce(rjsfSchema, (draft) => {
      draft.uiSchema[UI_ORDER] = nextUiOrder;
      if (!draft.schema.properties) {
        draft.schema.properties = {};
      }

      draft.schema.properties[propertyName] = newProperty;
    });
    setRjsfSchema(nextRjsfSchema);
    setActiveField(propertyName);
  };

  const moveProperty = (direction: "up" | "down") => {
    const nextUiOrder = moveStringInArray(uiOrder, activeField, direction);
    setUiOrder(nextUiOrder);
  };

  const removeProperty = () => {
    const propertyToRemove = activeField;
    const nextUiOrder = replaceStringInArray(uiOrder, propertyToRemove);
    const nextActiveField = nextUiOrder.length > 1 ? nextUiOrder[0] : undefined;

    setActiveField(nextActiveField);

    const nextRjsfSchema = produce(rjsfSchema, (draft) => {
      if (schema.required?.length > 0) {
        const nextRequired = replaceStringInArray(
          schema.required,
          propertyToRemove
        );
        draft.schema.required = nextRequired;
      }

      draft.uiSchema[UI_ORDER] = nextUiOrder;
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete draft.schema.properties[propertyToRemove];
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete draft.uiSchema[propertyToRemove];
    });

    setRjsfSchema(nextRjsfSchema);
  };

  // There's always at least 1 item in uiOrder array, "*".
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
      {activeField && Boolean(schema.properties?.[activeField]) && (
        <FieldEditor
          name={name}
          propertyName={activeField}
          setActiveField={setActiveField}
        />
      )}

      <Button onClick={addProperty} variant="primary" size="sm">
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
