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

import { useSelector } from "react-redux";
import { selectTraceError } from "@/devTools/editor/slices/runtimeSelectors";
import { useCallback, useEffect } from "react";
import { BlockPipeline } from "@/blocks/types";
import {
  FieldHelperProps,
  FieldInputProps,
  FieldMetaProps,
  useField,
  useFormikContext,
} from "formik";
import { TraceError } from "@/telemetry/trace";
import { isInputValidationError } from "@/blocks/errors";
import { OutputUnit } from "@cfworker/json-schema";

function usePipelineField(
  pipelineFieldName: string
): [
  FieldInputProps<BlockPipeline>,
  FieldMetaProps<BlockPipeline>,
  FieldHelperProps<BlockPipeline>,
  TraceError
] {
  const traceError = useSelector(selectTraceError);
  const formikContext = useFormikContext();

  useEffect(() => {
    console.log("invoking form validation");
    void formikContext.validateForm();
  }, [traceError]);

  const validatePipline = useCallback(
    (blockPipeline: BlockPipeline) => {
      // ToDo
      // 1. Move to a hook `useFieldWithErrorTrace
      // 2. build the error from period-separated field name
      // 3. make Formik to validate the fields when Trace changes
      // 4. Q: how to warn about prev unsuccessful run?
      console.log("blockPipeline.Validate. Trace Error", traceError);
      if (!traceError) {
        return;
      }

      const { error, blockInstanceId } = traceError;
      const blockIndex = blockPipeline.findIndex(
        (pipelineBlock) => pipelineBlock.instanceId === blockInstanceId
      );
      if (blockIndex === -1) {
        return;
      }

      const errors: Record<string, unknown> = {};
      if (isInputValidationError(error)) {
        const REQUIRED_FIELD_REGEX = /^Instance does not have required property "(?<property>.+)"\.$/;
        for (const unit of (error.errors as unknown) as OutputUnit[]) {
          const property = REQUIRED_FIELD_REGEX.exec(unit.error)?.groups
            .property;
          const message = "This field is required";
          errors[blockIndex] = {
            config: {
              [property]: message,
            },
          };
        }
      } else {
        errors[blockIndex] = error.message;
      }

      console.log("blockPipeline.Validate. Errors", errors);

      return errors;
    },
    [traceError]
  );

  const formikField = useField<BlockPipeline>({
    name: pipelineFieldName,
    validate: validatePipline,
  });

  return [...formikField, traceError];
}

export default usePipelineField;
