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
import { useField, useFormikContext, setNestedObjectValues } from "formik";
import { TraceError } from "@/telemetry/trace";
import { useAsyncEffect } from "use-async-effect";
import validateOutputKey from "@/devTools/editor/validation/validateOutputKey";
import applyTraceError from "@/devTools/editor/validation/applyTraceError";
import { isEmpty } from "lodash";
import { BlocksMap } from "@/devTools/editor/tabs/editTab/editTabTypes";

/*
 * PipelineErrors is Formik error... thing.
 * It can be a string, a record of strings, or a record of records... i.e. it is dynamic and depends on the level of the state tree where the error happens.
 * Speaking about `PipelineErrors[0]`, the error state normally is not an array, but since the pipeline is an array we use numbers (index) to get the error related to a block.
 * Despite it looks like an array (the top-level may look like an array - have numbers for property names), it is an object.
 * For instance, it doesn't have a `length` property.
 */
export type PipelineErrors = string | Record<string | number, unknown>;

const pipelineBlocksFieldName = "extension.blockPipeline";

function usePipelineField(
  allBlocks: BlocksMap
): {
  blockPipeline: BlockPipeline;
  blockPipelineErrors: PipelineErrors;
  errorTraceEntry: TraceError;
} {
  const errorTraceEntry = useSelector(selectTraceError);

  const validatePipelineBlocks = useCallback(
    (pipeline: BlockPipeline): void | PipelineErrors => {
      const formikErrors: Record<string, unknown> = {};

      validateOutputKey(formikErrors, pipeline, allBlocks);
      applyTraceError(formikErrors, errorTraceEntry, pipeline);

      return isEmpty(formikErrors) ? undefined : formikErrors;
    },
    [errorTraceEntry, allBlocks]
  );

  const [
    { value: blockPipeline },
    { error: blockPipelineErrors },
  ] = useField<BlockPipeline>({
    name: pipelineBlocksFieldName,
    // @ts-expect-error working with nested errors
    validate: validatePipelineBlocks,
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
    [errorTraceEntry]
  );

  return {
    blockPipeline,
    blockPipelineErrors,
    errorTraceEntry,
  };
}

export default usePipelineField;
