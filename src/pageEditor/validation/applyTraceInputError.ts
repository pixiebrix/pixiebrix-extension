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

import { isInputValidationError } from "@/blocks/errors";
import { TraceError } from "@/telemetry/trace";
import { joinName } from "@/utils";
import { set } from "lodash";
import { FormikErrorTree } from "@/pageEditor/tabs/editTab/editTabTypes";

const requiredFieldRegex =
  /^Instance does not have required property "(?<property>.+)"\.$/;

const rootPropertyRegex = /^#\/(?<property>.+)$/;

/**
 * Gets Input validation error from the Trace
 * @param pipelineErrors Pipeline validation errors for the Formik context.
 * @param errorTraceEntry Trace error from running the block ({@link TraceError}).
 * @param blockIndex Index of block that generated the Trace Error.
 * @returns True if errors found, false otherwise.
 */
function applyTraceInputError(
  pipelineErrors: FormikErrorTree,
  errorTraceEntry: TraceError,
  blockIndex: number
) {
  const { error: traceError } = errorTraceEntry;

  if (!isInputValidationError(traceError)) {
    return;
  }

  const errors: string[] = [];
  for (const inputError of traceError.errors) {
    const rootProperty = rootPropertyRegex.exec(inputError.instanceLocation)
      ?.groups.property;
    if (rootProperty) {
      const propertyNameInPipeline = joinName(
        String(blockIndex),
        "config",
        rootProperty
      );
      const errorMessage = inputError.error;
      set(pipelineErrors, propertyNameInPipeline, errorMessage);
      continue;
    }

    const requiredProperty = requiredFieldRegex.exec(inputError.error)?.groups
      .property;
    if (requiredProperty) {
      const propertyNameInPipeline = joinName(
        String(blockIndex),
        "config",
        requiredProperty
      );
      const errorMessage = "Error from the last run: This field is required.";
      set(pipelineErrors, propertyNameInPipeline, errorMessage);
      continue;
    }

    if (inputError.error) {
      errors.push(inputError.error);
    }
  }

  // eslint-disable-next-line security/detect-object-injection -- accessing the error tree by index
  if (typeof pipelineErrors[blockIndex] === "undefined" && errors.length > 0) {
    // eslint-disable-next-line security/detect-object-injection -- accessing the error tree by index
    pipelineErrors[blockIndex] = errors.join(" ");
  }
}

export default applyTraceInputError;
