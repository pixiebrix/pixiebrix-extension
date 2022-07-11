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

import { useField } from "formik";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectActiveNodeError } from "@/pageEditor/slices/editorSelectors";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { isEqual } from "lodash";

/**
 * Synchronizes the active node Redux and Formik states
 * @param blockFieldName the name (path) of the block in the Formik state
 */
function useNodeValidation(blockFieldName: string) {
  const dispatch = useDispatch();
  const nodeError = useSelector(selectActiveNodeError);
  const [, { error: fieldError }] = useField({
    name: blockFieldName,
    validate() {
      if (
        nodeError?.fieldErrors != null &&
        !isEqual(nodeError.fieldErrors, fieldError)
      ) {
        // When Formik gets the error from Redux it will push it through its pipeline and
        // this hook will get the new fieldError that equals nodeError.fieldErrors
        // so this doesn't get into any sort of infinite loop
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- we set Error Tree in Formik
        return nodeError.fieldErrors as any;
      }
    },
  });

  // After Formik validation get the error state and push to Redux
  useEffect(() => {
    if (!isEqual(nodeError?.fieldErrors, fieldError)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- we get Error Tree from Formik
      dispatch(editorActions.setFieldsError(fieldError as any));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pushing, error state to Redux, it's only fieldError that we care about here
  }, [fieldError]);
}

export default useNodeValidation;
