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

import { useField, setNestedObjectValues } from "formik";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import useDebouncedEffect from "@/pageEditor/hooks/useDebouncedEffect";
import { selectActiveNodeError } from "@/pageEditor/slices/editorSelectors";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { isEqual } from "lodash";
import { UUID } from "@/core";

/**
 * Synchronizes the active node Redux and Formik states
 * @param blockFieldName the name (path) of the block in the Formik state
 */
function useNodeValidation(blockFieldName: string, nodeId: UUID) {
  const dispatch = useDispatch();
  const nodeError = useSelector(selectActiveNodeError);
  const [, { error: fieldError }, { setError, setTouched }] =
    useField(blockFieldName);

  // After Formik validation get the error state and push to Redux
  useDebouncedEffect(
    fieldError,
    () => {
      if (!isEqual(nodeError?.fieldErrors, fieldError)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- we get Error Tree from Formik
        dispatch(editorActions.setFieldsError(fieldError as any));
      }
    },
    500
  );

  // On load, get the error state from Redux and push to Formik
  useEffect(() => {
    // FIXME: don't use setTimeout here
    // Formik seems to erase the error set on mount, so we wait a bit
    // Figure out what's going on an fix it
    setTimeout(() => {
      if (
        nodeError?.fieldErrors != null &&
        !isEqual(nodeError.fieldErrors, fieldError)
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- we set Error Tree in Formik
        setError(nodeError.fieldErrors as any);
        setTouched(setNestedObjectValues(nodeError.fieldErrors, true), false);
      }
    }, 1000);
  }, [nodeId]);
}

export default useNodeValidation;
