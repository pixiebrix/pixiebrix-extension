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

import { getIn, useFormikContext } from "formik";
import { produce } from "immer";
import { useCallback, useMemo } from "react";
import {
  FieldInputMode,
  inferInputMode,
} from "@/components/fields/schemaFields/fieldInputMode";
import { isObject } from "@/utils";
import { getFieldNamesFromPathString } from "@/runtime/pathHelpers";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import { Schema } from "@/core";

export function removeField(parent: unknown, fieldName: string): void {
  if (Array.isArray(parent)) {
    const index = Number(fieldName);
    parent.splice(index, 1);
  } else if (isObject(parent)) {
    // eslint-disable-next-line security/detect-object-injection,@typescript-eslint/no-dynamic-delete
    delete parent[fieldName];
  } else {
    // Can't remove a field from something that isn't an array or object
    console.warn(
      `Can't remove '${fieldName}', parent is not an object or array`,
      {
        parent,
      }
    );
  }
}

function useToggleFormField(
  name: string,
  schema: Schema
): {
  inputMode: FieldInputMode;
  onOmitField: () => void;
} {
  const [parentFieldName, fieldName] = getFieldNamesFromPathString(name);
  const { values: formState, setValues: setFormState } =
    useFormikContext<FormState>();
  const parentValues = getIn(formState, parentFieldName) ?? formState;

  const inputMode = useMemo(
    () => inferInputMode(parentValues, fieldName, schema),
    [fieldName, parentValues, schema]
  );

  const onOmitField = useCallback(() => {
    const newFormState = produce(formState, (draft) => {
      if (parentFieldName) {
        const parentField = getIn(draft, parentFieldName);
        if (parentField) {
          removeField(parentField, fieldName);
        }
      } else if (fieldName in formState) {
        removeField(draft, fieldName);
      } else {
        // Cannot find property to remove
        console.warn(`Unable to find field '${name}' to remove`, {
          parentFieldName,
          formState,
        });
      }
    });

    setFormState(newFormState);
  }, [fieldName, formState, name, parentFieldName, setFormState]);

  return {
    inputMode,
    onOmitField,
  };
}

export default useToggleFormField;
