/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import styles from "./FormEditor.module.scss";

import { useField } from "formik";
import React, { useEffect, useMemo } from "react";
import {
  RJSFSchema,
  SelectStringOption,
  SetActiveField,
} from "@/components/formBuilder/formBuilderTypes";
import { Button, Col, Row } from "react-bootstrap";
import FieldEditor from "./FieldEditor";
import {
  DEFAULT_FIELD_TYPE,
  generateNewPropertyName,
  moveStringInArray,
  normalizeSchema,
  normalizeUiOrder,
  replaceStringInArray,
} from "@/components/formBuilder/formBuilderHelpers";
import { UI_ORDER } from "@/components/formBuilder/schemaFieldNames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { Schema } from "@/core";
import { produce } from "immer";
import { joinName } from "@/utils";
import FieldTemplate from "@/components/form/FieldTemplate";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import LayoutWidget from "@/components/LayoutWidget";
import { findLast, set, unset } from "lodash";

export type FormEditorProps = {
  name: string;
  showFormTitle?: boolean;
  activeField?: string;
  setActiveField: SetActiveField;
  fieldTypes?: SelectStringOption[];
};

const FormEditor: React.FC<FormEditorProps> = ({
  name,
  showFormTitle = true,
  activeField,
  setActiveField,
  fieldTypes,
}) => {
  const [
    { value: rjsfSchema = {} as RJSFSchema },
    ,
    { setValue: setRjsfSchema },
  ] = useField<RJSFSchema>(name);
  const [{ value: uiOrder }, , { setValue: setUiOrder }] = useField<string[]>(
    joinName(name, "uiSchema", UI_ORDER)
  );

  const { schema, uiSchema } = rjsfSchema;

  // Select the active field when FormEditor field changes
  useEffect(
    () => {
      // Trust that activeField changes properly with the schema name
      if (activeField != null) {
        return;
      }

      // eslint-disable-next-line security/detect-object-injection -- UI_ORDER is a known field
      const firstInOrder = uiSchema?.[UI_ORDER]?.[0];
      if (firstInOrder && firstInOrder !== "*") {
        setActiveField(firstInOrder);
        return;
      }

      const firstInProperties = Object.keys(schema?.properties ?? {})[0];
      if (firstInProperties) {
        setActiveField(firstInProperties);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetting activeField only on new name
    [name]
  );

  const { titleFieldProps, descriptionFieldProps } = useMemo(() => {
    const titleFieldProps: SchemaFieldProps = {
      name: joinName(name, "schema", "title"),
      schema: { type: "string" },
      label: "Form Title",
    };
    const descriptionFieldProps: SchemaFieldProps = {
      name: joinName(name, "schema", "description"),
      schema: { type: "string" },
      label: "Form Description",
    };
    return { titleFieldProps, descriptionFieldProps };
  }, [name]);

  const propertyKeys = Object.keys(schema?.properties ?? {});

  const addProperty = () => {
    const propertyName = generateNewPropertyName(propertyKeys);
    const newProperty: Schema = {
      title: propertyName,
      type: DEFAULT_FIELD_TYPE,
    };
    const nextUiOrder = activeField
      ? replaceStringInArray(
          normalizeUiOrder(propertyKeys, uiOrder),
          activeField,
          activeField,
          propertyName
        )
      : replaceStringInArray(
          normalizeUiOrder(propertyKeys, uiOrder),
          "*",
          propertyName,
          "*"
        );

    const nextRjsfSchema = produce(rjsfSchema, (draft) => {
      draft.schema = normalizeSchema(schema);
      // eslint-disable-next-line security/detect-object-injection -- prop name is generated
      draft.schema.properties[propertyName] = newProperty;

      if (!uiSchema) {
        draft.uiSchema = {};
      }

      // eslint-disable-next-line security/detect-object-injection -- prop name is a constant
      draft.uiSchema[UI_ORDER] = nextUiOrder;
    });
    setRjsfSchema(nextRjsfSchema);
    setActiveField(propertyName);
  };

  const moveProperty = (direction: "up" | "down") => {
    const nextUiOrder = moveStringInArray(
      normalizeUiOrder(propertyKeys, uiOrder),
      activeField,
      direction
    );
    setUiOrder(nextUiOrder);
  };

  const removeProperty = () => {
    const propertyToRemove = activeField;
    const nextUiOrder = replaceStringInArray(
      normalizeUiOrder(propertyKeys, uiOrder),
      propertyToRemove
    );
    const nextActiveField = nextUiOrder.length > 1 ? nextUiOrder[0] : undefined;

    setActiveField(nextActiveField);

    const nextRjsfSchema = produce(rjsfSchema, (draft) => {
      draft.schema = normalizeSchema(schema);

      if (schema.required?.length > 0) {
        draft.schema.required = replaceStringInArray(
          schema.required,
          propertyToRemove
        );
      }

      unset(draft.schema.properties, propertyToRemove);

      if (!uiSchema) {
        draft.uiSchema = {};
      }

      set(draft.uiSchema, UI_ORDER, nextUiOrder);
      unset(draft.uiSchema, propertyToRemove);
    });

    setRjsfSchema(nextRjsfSchema);
  };

  // The uiOrder field may not be initialized yet
  const order = uiOrder ?? ["*"];
  const canMoveUp =
    Boolean(activeField) &&
    (order.length > 2
      ? order[0] !== activeField
      : propertyKeys[0] !== activeField);
  const canMoveDown =
    Boolean(activeField) &&
    (order.length === propertyKeys.length + 1
      ? order[order.length - 2] !== activeField
      : Array.isArray(order) &&
        findLast(propertyKeys, (key) => !order.includes(key)) !== activeField);

  return (
    <>
      {showFormTitle && (
        <>
          <SchemaField {...titleFieldProps} />
          <SchemaField {...descriptionFieldProps} />
          <hr />
        </>
      )}
      <Row className={styles.addRow}>
        <Col>
          <Button onClick={addProperty} variant="primary" size="sm">
            <FontAwesomeIcon icon={faPlus} /> Add new field
          </Button>
        </Col>
      </Row>

      <Row className={styles.currentFieldRow}>
        <Col xl="3" className={styles.currentField}>
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

      {activeField && Boolean(schema?.properties?.[activeField]) && (
        <FieldEditor
          name={name}
          propertyName={activeField}
          setActiveField={setActiveField}
          fieldTypes={fieldTypes}
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
