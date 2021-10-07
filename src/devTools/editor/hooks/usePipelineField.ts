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
import { BlockConfig, BlockPipeline } from "@/blocks/types";
import { useField, useFormikContext, setNestedObjectValues } from "formik";
import { TraceError } from "@/telemetry/trace";
import { useAsyncEffect } from "use-async-effect";
import traceErrorInputValidator from "@/devTools/editor/validators/traceErrorInputValidator";
import traceErrorGeneralValidator from "@/devTools/editor/validators/traceErrorGeneralValidator";

const pipelineBlocksFieldName = "extension.blockPipeline";

function usePipelineField(): {
  blockPipeline: BlockPipeline;
  blockPipelineErrors: string | Record<string, unknown>;
  errorTraceEntry: TraceError;
} {
  const errorTraceEntry = useSelector(selectTraceError);

  const validatePipelineBlocks = useCallback(
    (pipeline: BlockPipeline) => {
      if (!errorTraceEntry) {
        return;
      }

      const { blockInstanceId } = errorTraceEntry;
      const blockIndex = pipeline.findIndex(
        (block) => block.instanceId === blockInstanceId
      );
      if (blockIndex === -1) {
        return;
      }

      const formikErrors: Record<string, unknown> = {};
      traceErrorInputValidator(formikErrors, errorTraceEntry, blockIndex);
      traceErrorGeneralValidator(formikErrors, errorTraceEntry, blockIndex);

      return formikErrors;
    },
    [errorTraceEntry]
  );

  const [{ value: blockPipeline }, { error: blockPipelineErrors }] = useField<
    BlockConfig[]
  >({
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
