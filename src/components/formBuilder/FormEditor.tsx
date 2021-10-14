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
import { Button, ButtonGroup, Col, Row } from "react-bootstrap";
import FieldEditor from "./FieldEditor";
import {
  DEFAULT_FIELD_TYPE,
  generateNewPropertyName,
  moveStringInArray,
  replaceStringInArray,
  updateRjsfSchemaWithDefaultsIfNeeded,
} from "./formBuilderHelpers";
import { UI_ORDER } from "./schemaFieldNames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faArrowUp,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { Schema } from "@/core";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { produce } from "immer";
import styles from "./FormEditor.module.scss";
import { joinName } from "@/utils";
import { isEmpty } from "lodash";
import FieldTemplate from "@/components/form/FieldTemplate";

export type FormEditorProps = {
  name: string;
  activeField?: string;
  setActiveField: SetActiveField;
};

const LayoutWidget: React.FC<{
  canMoveUp: boolean;
  moveUp: () => void;
  canMoveDown: boolean;
  moveDown: () => void;
}> = ({ canMoveUp, moveUp, canMoveDown, moveDown }) => (
  <ButtonGroup>
    <Button onClick={moveUp} disabled={!canMoveUp} variant="light" size="sm">
      <FontAwesomeIcon icon={faArrowUp} /> Move up
    </Button>
    <Button
      onClick={moveDown}
      disabled={!canMoveDown}
      variant="light"
      size="sm"
    >
      <FontAwesomeIcon icon={faArrowDown} /> Move down
    </Button>
  </ButtonGroup>
);

const FormEditor: React.FC<FormEditorProps> = ({
  name,
  activeField,
  setActiveField,
}) => {
  const [
    { value: rjsfSchema },
    ,
    { setValue: setRjsfSchema },
  ] = useField<RJSFSchema>(name);
  const [{ value: uiOrder }, , { setValue: setUiOrder }] = useField<string[]>(
    joinName(name, "uiSchema", UI_ORDER)
  );

  const { schema, uiSchema } = rjsfSchema;

  useEffect(() => {
    // Set default values if needed
    const nextRjsfSchema = updateRjsfSchemaWithDefaultsIfNeeded(rjsfSchema);
    if (nextRjsfSchema !== null) {
      setRjsfSchema(nextRjsfSchema);
    }
  }, [rjsfSchema, setRjsfSchema]);

  // Select the first field by default
  useEffect(
    () => {
      if (activeField == null && !isEmpty(schema?.properties)) {
        setActiveField(Object.keys(schema.properties)[0]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run onMount
    []
  );

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
        draft.schema.required = replaceStringInArray(
          schema.required,
          propertyToRemove
        );
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
  const canMoveUp =
    Boolean(activeField) && uiOrder?.length > 2 && uiOrder[0] !== activeField;
  const canMoveDown =
    Boolean(activeField) &&
    uiOrder?.length > 2 &&
    uiOrder[uiOrder.length - 2] !== activeField;

  return (
    <>
      <ConnectedFieldTemplate
        name={joinName(name, "schema", "title")}
        label="Form Title"
      />
      <ConnectedFieldTemplate
        name={joinName(name, "schema", "description")}
        label="Form Description"
      />
      <hr />

      <Row className={styles.addRow}>
        <Col>
          <Button onClick={addProperty} variant="primary" size="sm">
            <FontAwesomeIcon icon={faPlus} /> Add new field
          </Button>
        </Col>
      </Row>

      <Row className={styles.currFieldRow}>
        <Col xl="3" className={styles.currField}>
          <h6>Current Field</h6>
        </Col>
        {activeField && (
          <Col xl>
            <Button onClick={removeProperty} variant="danger" size="sm">
              <FontAwesomeIcon icon={faTrash} /> Remove field
            </Button>
          </Col>
        )}
        <Col xl>
          <small className="text-muted">
            Use the Preview Tab on the right to select a field to edit ⟶
          </small>
        </Col>
      </Row>

      {activeField && Boolean(schema.properties?.[activeField]) && (
        <FieldEditor
          name={name}
          propertyName={activeField}
          setActiveField={setActiveField}
        />
      )}

      {activeField && (canMoveUp || canMoveDown) && (
        <FieldTemplate
          name="layoutButtons"
          label="Field Order"
          as={LayoutWidget}
          canMoveUp={canMoveUp}
          moveUp={() => {
            moveProperty("up");
          }}
          canMoveDown={canMoveDown}
          moveDown={() => {
            moveProperty("down");
          }}
        />
      )}
    </>
  );
};

export default FormEditor;
