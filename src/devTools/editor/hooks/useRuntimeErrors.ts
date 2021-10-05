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

import { useField, useFormikContext } from "formik";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import { useSelector } from "react-redux";
import { selectTraceError } from "@/devTools/editor/slices/runtimeSelectors";
import { useEffect } from "react";
import { isInputValidationError } from "@/blocks/errors";
import { OutputUnit } from "@cfworker/json-schema";
import { joinName } from "@/utils";
import { BlockPipeline } from "@/blocks/types";
import { TraceError } from "@/telemetry/trace";

type FormikError = {
  fieldName: string;
  message: string;
};

const REQUIRED_FIELD_REGEX = /^Instance does not have required property "(?<property>.+)"\.$/;

function toFormikError(
  blockFieldName: string,
  error: OutputUnit
): FormikError | undefined {
  if (error.keywordLocation === "#/required") {
    const property = REQUIRED_FIELD_REGEX.exec(error.error)?.groups.property;
    if (property) {
      return {
        fieldName: joinName(blockFieldName, "config", property),
        message: "This field is required",
      };
    }
  }
}

type RuntimeErrors = {
  traceError: TraceError | null;
};

/**
 * Hook that updates Formik field errors based on latest runtime trace.
 * @see useExtensionTrace
 */
// ToDo remove
function useRuntimeErrors(pipelineFieldName: string): RuntimeErrors {
  const { setFieldError, setFieldTouched } = useFormikContext<FormState>();
  const [{ value: blockPipeline = [] }] = useField<BlockPipeline>(
    pipelineFieldName
  );

  const traceError = useSelector(selectTraceError);

  useEffect(
    () => {
      if (traceError && isInputValidationError(traceError.error)) {
        const { error, blockInstanceId } = traceError;
        const blockIndex = blockPipeline.findIndex(
          (x) => x.instanceId === blockInstanceId
        );
        if (blockIndex >= 0) {
          for (const unit of error.errors) {
            const formikError = toFormikError(
              joinName(pipelineFieldName, String(blockIndex)),
              unit
            );
            if (formikError) {
              // Set to touched so it shows the error message
              setFieldTouched(formikError.fieldName);
              setFieldError(formikError.fieldName, formikError.message);
            }
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run whenever there's a new trace error
    [traceError]
  );

  return {
    traceError,
  };
}

export default useRuntimeErrors;
