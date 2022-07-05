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
  blockPath: string
) {
  const { error: traceError } = errorTraceEntry;

  if (!isInputValidationError(traceError)) {
    return;
  }

  for (const maybeInputError of traceError.errors) {
    const rootProperty = rootPropertyRegex.exec(
      maybeInputError.instanceLocation
    )?.groups.property;
    if (rootProperty) {
      const propertyNameInPipeline = joinName(
        blockPath,
        "config",
        rootProperty
      );
      const errorMessage = maybeInputError.error;
      set(pipelineErrors, propertyNameInPipeline, errorMessage);
      continue;
    }

    const requiredProperty = requiredFieldRegex.exec(maybeInputError.error)
      ?.groups.property;
    if (requiredProperty) {
      const propertyNameInPipeline = joinName(
        blockPath,
        "config",
        requiredProperty
      );
      const errorMessage = "Error from the last run: This field is required.";
      set(pipelineErrors, propertyNameInPipeline, errorMessage);
      continue;
    }

    // This is not a known input error. Ignoring it here.
    // It will be handled by the applyTraceBlockError
  }
}

export default applyTraceInputError;
