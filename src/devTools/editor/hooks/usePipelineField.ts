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
import { useCallback } from "react";
import { BlockPipeline } from "@/blocks/types";
import {
  FieldHelperProps,
  FieldInputProps,
  FieldMetaProps,
  useField,
  useFormikContext,
  setNestedObjectValues,
} from "formik";
import { TraceError } from "@/telemetry/trace";
import { isInputValidationError } from "@/blocks/errors";
import { OutputUnit } from "@cfworker/json-schema";
import { useAsyncEffect } from "use-async-effect";

const REQUIRED_FIELD_REGEX = /^Instance does not have required property "(?<property>.+)"\.$/;

function usePipelineField(
  pipelineFieldName: string
): [
  FieldInputProps<BlockPipeline>,
  FieldMetaProps<BlockPipeline>,
  FieldHelperProps<BlockPipeline>,
  TraceError
] {
  const traceError = useSelector(selectTraceError);

  const validatePipeline = useCallback(
    (blockPipeline: BlockPipeline) => {
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
        // ToDo Build the error from period-separated field name
        for (const unit of (error.errors as unknown) as OutputUnit[]) {
          const property = REQUIRED_FIELD_REGEX.exec(unit.error)?.groups
            .property;
          if (property) {
            const message = "This field is required";
            // eslint-disable-next-line security/detect-object-injection
            errors[blockIndex] = {
              config: {
                [property]: message,
              },
            };
          } else {
            // eslint-disable-next-line security/detect-object-injection
            errors[blockIndex] = error.message;
          }
        }
      } else {
        // eslint-disable-next-line security/detect-object-injection
        errors[blockIndex] = error.message;
      }

      return errors;
    },
    [traceError]
  );

  const formikField = useField<BlockPipeline>({
    name: pipelineFieldName,
    // @ts-expect-error working with nested errors
    validate: validatePipeline,
  });

  const formikContext = useFormikContext();
  useAsyncEffect(
    async (isMounted) => {
      const validationErrors = await formikContext.validateForm();
      if (!isMounted()) {
        return;
      }

      if (Object.keys(validationErrors).length > 0) {
        formikContext.setTouched(setNestedObjectValues(validationErrors, true));
      }
    },
    [traceError]
  );

  return [...formikField, traceError];
}

export default usePipelineField;
