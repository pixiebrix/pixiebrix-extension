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

import { useDispatch, useSelector } from "react-redux";
import { selectTraceErrors } from "@/pageEditor/slices/runtimeSelectors";
import { useCallback, useEffect } from "react";
import { BlockPipeline } from "@/blocks/types";
import { useField, useFormikContext, setNestedObjectValues } from "formik";
import { useAsyncEffect } from "use-async-effect";
import validateOutputKey from "@/pageEditor/validation/validateOutputKey";
import validateRenderers from "@/pageEditor/validation/validateRenderers";
import applyTraceErrors from "@/pageEditor/validation/applyTraceError";
import { isEmpty, uniq } from "lodash";
import { FormikErrorTree } from "@/pageEditor/tabs/editTab/editTabTypes";
import { PIPELINE_BLOCKS_FIELD_NAME } from "@/pageEditor/consts";
import { FormState } from "@/pageEditor/pageEditorTypes";
import useAllBlocks from "./useAllBlocks";
import {
  selectActiveElementId,
  selectErrorMap,
  selectPipelineMap,
} from "@/pageEditor/slices/editorSelectors";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { getErrorMessage } from "@/errors/errorHelpers";
import { UUID } from "@/core";
import { TraceError } from "@/telemetry/trace";

function usePipelineErrors() {
  const [allBlocks] = useAllBlocks();
  const traceErrors = useSelector(selectTraceErrors);
  const formikContext = useFormikContext<FormState>();
  const extensionPointType = formikContext.values.type;
  const pipelineMap = useSelector(selectPipelineMap);
  const errorMap = useSelector(selectErrorMap);
  const dispatch = useDispatch();
  const activeElementId = useSelector(selectActiveElementId);

  const validatePipelineBlocks = useCallback(
    (pipeline: BlockPipeline): void | FormikErrorTree => {
      const formikErrors: FormikErrorTree = {};

      // TODO move this to the OutputKey field level
      validateOutputKey(formikErrors, pipeline, allBlocks);
      validateRenderers(formikErrors, pipeline, allBlocks, extensionPointType);
      applyTraceErrors(formikErrors, traceErrors, pipelineMap);

      return isEmpty(formikErrors) ? undefined : formikErrors;
    },
    [allBlocks, extensionPointType, pipelineMap, traceErrors]
  );

  useField<BlockPipeline>({
    name: PIPELINE_BLOCKS_FIELD_NAME,
    // @ts-expect-error -- validatePipelineBlocks can return an object b/c we're working with nested errors
    validate: validatePipelineBlocks,
  });

  useEffect(() => {
    // Applying trace errors to the error state
    const nodesWithErrors: UUID[] = Object.keys(errorMap) as UUID[];
    const traceErrorsMap: Record<UUID, TraceError> = {};
    const activeElementErrors = traceErrors.filter(
      ({ extensionId }) => extensionId === activeElementId
    );
    for (const traceError of activeElementErrors) {
      nodesWithErrors.push(traceError.blockInstanceId);
      traceErrorsMap[traceError.blockInstanceId] = traceError;
    }

    for (const nodeId of uniq(nodesWithErrors)) {
      const traceError = traceErrorsMap[nodeId];
      const nodeError = errorMap[nodeId];

      if (traceError == null) {
        if (nodeError?.message != null) {
          dispatch(
            editorActions.setError({
              nodeId,
              nodeError: null,
            })
          );
        }
      } else {
        dispatch(
          editorActions.setError({
            nodeId,
            nodeError: getErrorMessage(traceError.error),
          })
        );
      }
    }
  }, [traceErrors]);

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

export default usePipelineErrors;
