/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { useField } from "formik";
import React, { useEffect } from "react";
import {
  type RJSFSchema,
  type SelectStringOption,
  type SetActiveField,
} from "@/components/formBuilder/formBuilderTypes";
import { Button } from "react-bootstrap";
import {
  DEFAULT_FIELD_TYPE,
  generateNewPropertyName,
  normalizeSchema,
  getNormalizedUiOrder,
  replaceStringInArray,
} from "@/components/formBuilder/formBuilderHelpers";
import { UI_ORDER } from "@/components/formBuilder/schemaFieldNames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { type Schema } from "@/types/schemaTypes";
import { produce } from "immer";
import { joinName } from "@/utils/formUtils";
import { ActiveField } from "./ActiveField";
import { assertNotNullish, type Nullishable } from "@/utils/nullishUtils";

export type FormEditorProps = {
  /**
   * The Formik name of the form field.
   */
  name: string;
  activeField: Nullishable<string>;
  setActiveField: SetActiveField;
  fieldTypes?: SelectStringOption[];
};

const FormEditor: React.FC<FormEditorProps> = ({
  name,
  activeField,
  setActiveField,
  fieldTypes,
}) => {
  const [{ value: rjsfSchema }, , { setValue: setRjsfSchema }] =
    useField<RJSFSchema>(name);
  const [{ value: uiOrder }, , { setValue: setUiOrder }] = useField<string[]>(
    joinName(name, "uiSchema", UI_ORDER),
  );

  const { schema, uiSchema } = rjsfSchema ?? {};

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
    [name],
  );

  const propertyKeys = Object.keys(schema?.properties ?? {});

  const addProperty = async () => {
    const propertyName = generateNewPropertyName(propertyKeys);
    const newProperty: Schema = {
      title: propertyName,
      type: DEFAULT_FIELD_TYPE,
    };
    const nextUiOrder = activeField
      ? replaceStringInArray(
          getNormalizedUiOrder(propertyKeys, uiOrder),
          activeField,
          activeField,
          propertyName,
        )
      : replaceStringInArray(
          getNormalizedUiOrder(propertyKeys, uiOrder),
          "*",
          propertyName,
          "*",
        );

    const nextRjsfSchema = produce(rjsfSchema, (draft) => {
      normalizeSchema(draft);
      assertNotNullish(draft.schema?.properties, "Schema normalization failed");

      // eslint-disable-next-line security/detect-object-injection -- prop name is generated
      draft.schema.properties[propertyName] = newProperty;

      if (!uiSchema) {
        draft.uiSchema = {};
      }

      // eslint-disable-next-line security/detect-object-injection -- prop name is a constant
      draft.uiSchema[UI_ORDER] = nextUiOrder;
    });
    await setRjsfSchema(nextRjsfSchema);
    setActiveField(propertyName);
  };

  const removeProperty = async () => {
    assertNotNullish(activeField, "Active field is not set");
    const propertyToRemove = activeField;
    const nextUiOrder = replaceStringInArray(
      getNormalizedUiOrder(propertyKeys, uiOrder),
      propertyToRemove,
    );
    const nextActiveField = nextUiOrder.length > 1 ? nextUiOrder[0] : undefined;

    setActiveField(nextActiveField);

    const nextRjsfSchema = produce(rjsfSchema, (draft) => {
      normalizeSchema(draft);
      assertNotNullish(draft.schema?.properties, "Schema normalization failed");

      if (Number(draft.schema.required?.length) > 0) {
        draft.schema.required = replaceStringInArray(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- length check
          draft.schema.required!,
          propertyToRemove,
        );
      }

      // eslint-disable-next-line security/detect-object-injection -- not user input
      delete draft.schema.properties[propertyToRemove];

      if (!uiSchema) {
        draft.uiSchema = {};
      }

      // eslint-disable-next-line security/detect-object-injection -- prop name is a constant
      draft.uiSchema[UI_ORDER] = nextUiOrder;
      // eslint-disable-next-line security/detect-object-injection -- not user input
      delete draft.uiSchema[propertyToRemove];
    });

    await setRjsfSchema(nextRjsfSchema);
  };

  return (
    <>
      <p>Use the Preview Tab on the right to select a field to edit ⟶</p>
      <div className="d-flex mb-3 gap-1 gap-column-4 align-items-center flex-wrap">
        <Button onClick={addProperty} variant="primary" size="sm">
          <FontAwesomeIcon icon={faPlus} /> Add new field
        </Button>

        {/* If there's no active field, there's no field to select */}
        {activeField && (
          <Button onClick={removeProperty} variant="danger" size="sm">
            <FontAwesomeIcon icon={faTrash} /> Remove current field
          </Button>
        )}
      </div>

      {activeField && (
        <ActiveField
          name={name}
          activeField={activeField}
          setActiveField={setActiveField}
          fieldTypes={fieldTypes}
          schema={schema}
          uiOrder={uiOrder}
          propertyKeys={propertyKeys}
          setUiOrder={setUiOrder}
        />
      )}
    </>
  );
};

export default FormEditor;
