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

import { getIn, useFormikContext } from "formik";
import { UnknownObject } from "@/types";
import { produce } from "immer";
import { useCallback, useMemo } from "react";
import {
  FieldInputMode,
  inferInputMode,
} from "@/components/fields/schemaFields/fieldInputMode";

type UseOmitFormField = (
  name: string
) => {
  inputMode: FieldInputMode;
  onOmitField: () => void;
};

const useOmitFormField: UseOmitFormField = (name: string) => {
  const fieldName = name.includes(".")
    ? name.slice(name.lastIndexOf(".") + 1)
    : name;
  const parentFieldName = name.includes(".")
    ? name.slice(0, name.lastIndexOf("."))
    : undefined;
  const {
    values: formState,
    setValues: setFormState,
  } = useFormikContext<UnknownObject>();
  const parentValues = getIn(formState, parentFieldName) ?? formState;

  const inputMode = useMemo(() => inferInputMode(parentValues, fieldName), [
    fieldName,
    parentValues,
  ]);

  const onOmitField = useCallback(() => {
    const newFormState = produce(formState, (draft) => {
      if (parentFieldName) {
        const parentField = getIn(draft, parentFieldName);
        if (parentField) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete,security/detect-object-injection
          delete parentField[fieldName];
        }
      } else if (fieldName in formState) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete,security/detect-object-injection
        delete draft[fieldName];
      } else {
        // Cannot find property to delete
      }
    });

    setFormState(newFormState);
  }, [fieldName, formState, parentFieldName, setFormState]);

  return {
    inputMode,
    onOmitField,
  };
};

export default useOmitFormField;
