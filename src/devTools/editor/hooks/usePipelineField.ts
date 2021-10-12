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
import { BlockConfig, BlockPipeline } from "@/blocks/types";
import { useField, useFormikContext, setNestedObjectValues } from "formik";
import { TraceError } from "@/telemetry/trace";
import { useAsyncEffect } from "use-async-effect";
import outputKeyValidator, {
  clearOutputKeyValidatorValidatorCache,
} from "@/devTools/editor/validators/outputKeyValidator";
import { IBlock } from "@/core";
import traceErrorValidator from "@/devTools/editor/validators/traceErrorValidator";
import { isEmpty } from "lodash";

export type PipelineErrors = string | Record<string, unknown>;

const pipelineBlocksFieldName = "extension.blockPipeline";

function usePipelineField(
  allBlocks: IBlock[]
): {
  blockPipeline: BlockPipeline;
  blockPipelineErrors: PipelineErrors;
  errorTraceEntry: TraceError;
} {
  const errorTraceEntry = useSelector(selectTraceError);

  useEffect(() => {
    clearOutputKeyValidatorValidatorCache();
  }, [allBlocks]);

  const validatePipelineBlocks = useCallback(
    async (pipeline: BlockPipeline): Promise<void | PipelineErrors> => {
      const formikErrors: Record<string, unknown> = {};

      await outputKeyValidator(formikErrors, pipeline, allBlocks ?? []);
      traceErrorValidator(formikErrors, errorTraceEntry, pipeline);

      return isEmpty(formikErrors) ? undefined : formikErrors;
    },
    [errorTraceEntry, allBlocks]
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
