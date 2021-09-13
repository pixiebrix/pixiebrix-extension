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

import React, { useCallback, useRef, useState } from "react";
import JsonSchemaForm from "@rjsf/bootstrap-4";
import { editorFormSchema } from "./formBuilderSchemas";
import {
  buildFormConfigFromSchema,
  buildFormSchemaFromConfig,
} from "./formBuilderHelpers";
import { debounce } from "lodash";
import { ErrorSchema, IChangeEvent } from "@rjsf/core";
import { Schema } from "@/core";
import { FormConfig, SetActiveField } from "./formBuilderTypes";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faArrowUp,
  faPlus,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

type OnConfigChanged = (e: IChangeEvent<FormConfig>, es?: ErrorSchema) => void;
type OnSchemaChanged = (schema: Schema) => void;

const uiSchemaActive = "ui:activeField";

// ToDo split into ArrayFieldTemplate and FieldTemplate
const ArrayFieldTemplate = ({
  setActiveField,
  className,
  formData,
  uiSchema,
  canAdd,
  onAddClick,
  ...rest
}) => {
  console.log("ArrayFieldTemplate", rest);

  return (
    <div className={className}>
      {rest.items.map((item, index) => {
        const fieldName = formData[index].name;
        const isActive = uiSchema[uiSchemaActive] === fieldName;

        return (
          <div key={item.key}>
            <div
              onClick={() => {
                if (!isActive) {
                  setActiveField && setActiveField(fieldName);
                }
              }}
              style={
                isActive
                  ? {
                      border: "1px solid black",
                    }
                  : null
              }
            >
              {item?.children}
            </div>
            <div className="d-flex flex-row">
              {(item.hasMoveUp || item.hasMoveDown) && (
                <>
                  <Button
                    variant="link"
                    tabIndex={-1}
                    disabled={item.disabled || item.readonly || !item.hasMoveUp}
                    onClick={item.onReorderClick(item.index, item.index - 1)}
                  >
                    <FontAwesomeIcon icon={faArrowUp} />
                  </Button>
                  <Button
                    variant="link"
                    tabIndex={-1}
                    disabled={
                      item.disabled || item.readonly || !item.hasMoveDown
                    }
                    onClick={item.onReorderClick(item.index, item.index + 1)}
                  >
                    <FontAwesomeIcon icon={faArrowDown} />
                  </Button>
                </>
              )}

              {item.hasRemove && (
                <Button
                  variant="link"
                  tabIndex={-1}
                  disabled={item.disabled || item.readonly}
                  onClick={item.onDropIndexClick(item.index)}
                >
                  <FontAwesomeIcon icon={faTimes} />
                </Button>
              )}
            </div>
            {canAdd && (
              <Button onClick={onAddClick}>
                <FontAwesomeIcon icon={faPlus} />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
};

const FormEditor: React.FC<{
  currentSchema: Schema;
  onSchemaChanged: OnSchemaChanged;
  onSave: OnSchemaChanged;
  activeField?: string;
  setActiveField: SetActiveField;
}> = ({
  currentSchema,
  onSchemaChanged,
  onSave,
  activeField,
  setActiveField,
}) => {
  const [formConfig, setFormConfig] = useState(
    buildFormConfigFromSchema(currentSchema)
  );

  const onConfigChanged: OnConfigChanged = ({ formData }, errorSchema) => {
    setFormConfig(formData);

    if (!errorSchema) {
      updateFormSchema(formData);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- doesn't work with debounce
  const updateFormSchema = useCallback(
    debounce((formConfig: FormConfig) => {
      const nextSchema = buildFormSchemaFromConfig(currentSchema, formConfig);
      onSchemaChanged(nextSchema);
    }, 500),
    [onSchemaChanged]
  );

  const save = () => {
    onSave(buildFormSchemaFromConfig(currentSchema, formConfig));
  };

  // ToDo add dependency on setActiveField
  const ArrayFieldComponent = useRef((props) => (
    <ArrayFieldTemplate setActiveField={setActiveField} {...props} />
  )).current;

  const uiSchema = {
    fields: {
      "ui:activeField": activeField,
      "ui:ArrayFieldTemplate": ArrayFieldComponent,
    },
  };

  return (
    <JsonSchemaForm
      formData={formConfig}
      schema={editorFormSchema}
      uiSchema={uiSchema}
      onChange={onConfigChanged}
      onSubmit={save}
    >
      <button className="btn btn-primary" type="submit">
        Save
      </button>
    </JsonSchemaForm>
  );
};

export default FormEditor;
