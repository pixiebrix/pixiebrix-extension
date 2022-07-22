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

import { useSelector } from "react-redux";
import { selectTraceErrors } from "@/pageEditor/slices/runtimeSelectors";
import { useCallback } from "react";
import { BlockPipeline } from "@/blocks/types";
import { useField, useFormikContext, setNestedObjectValues } from "formik";
import { useAsyncEffect } from "use-async-effect";
import applyTraceErrors from "@/pageEditor/validation/applyTraceError";
import { isEmpty } from "lodash";
import { FormikErrorTree } from "@/pageEditor/tabs/editTab/editTabTypes";
import { PIPELINE_BLOCKS_FIELD_NAME } from "@/pageEditor/consts";
import { FormState } from "@/pageEditor/pageEditorTypes";
import { selectPipelineMap } from "@/pageEditor/slices/editorSelectors";

/**
 * Runs the validation that is applied on the fields level,
 * meaning it's part of the Formik validation
 */
function usePipelineValidation() {
  const traceErrors = useSelector(selectTraceErrors);
  const formikContext = useFormikContext<FormState>();
  const pipelineMap = useSelector(selectPipelineMap);

  // "validatePipelineBlocks" is invoked when Formik runs validation (currently onBlur)
  const validatePipelineBlocks = useCallback((): void | FormikErrorTree => {
    const formikErrors: FormikErrorTree = {};

    applyTraceErrors(formikErrors, traceErrors, pipelineMap);

    return isEmpty(formikErrors) ? undefined : formikErrors;
  }, [pipelineMap, traceErrors]);

  useField<BlockPipeline>({
    name: PIPELINE_BLOCKS_FIELD_NAME,
    // @ts-expect-error -- validatePipelineBlocks can return an object b/c we're working with nested errors
    validate: validatePipelineBlocks,
  });

  // When we get new traces, trigger the Formik validation which will invoke "validatePipelineBlocks"
  useAsyncEffect(
    async (isMounted) => {
      const validationErrors = await formikContext.validateForm();
      if (!isMounted()) {
        return;
      }

      if (Object.keys(validationErrors).length > 0) {
        formikContext.setTouched(
          setNestedObjectValues(validationErrors, true),
          false
        );
      }
    },
    [traceErrors]
  );
}

export default usePipelineValidation;
