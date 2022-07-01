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
import validateOutputKey from "@/pageEditor/validation/validateOutputKey";
import validateRenderers from "@/pageEditor/validation/validateRenderers";
import applyTraceErrors from "@/pageEditor/validation/applyTraceError";
import { isEmpty } from "lodash";
import { FormikErrorTree } from "@/pageEditor/tabs/editTab/editTabTypes";
import validateStringTemplates from "@/pageEditor/validation/validateStringTemplates";
import { PIPELINE_BLOCKS_FIELD_NAME } from "@/pageEditor/consts";
import { FormState } from "@/pageEditor/pageEditorTypes";
import useAllBlocks from "./useAllBlocks";

function usePipelineErrors() {
  const [allBlocks] = useAllBlocks();
  const traceErrors = useSelector(selectTraceErrors);
  const formikContext = useFormikContext<FormState>();
  const extensionPointType = formikContext.values.type;

  const validatePipelineBlocks = useCallback(
    (pipeline: BlockPipeline): void | FormikErrorTree => {
      const formikErrors: FormikErrorTree = {};

      // TODO move this to the OutputKey field level
      validateOutputKey(formikErrors, pipeline, allBlocks);
      validateRenderers(formikErrors, pipeline, allBlocks, extensionPointType);
      // TODO move this to the TextField level
      validateStringTemplates(formikErrors, pipeline);
      applyTraceErrors(formikErrors, traceErrors, pipeline);

      return isEmpty(formikErrors) ? undefined : formikErrors;
    },
    [allBlocks, extensionPointType, traceErrors]
  );

  useField<BlockPipeline>({
    name: PIPELINE_BLOCKS_FIELD_NAME,
    // @ts-expect-error working with nested errors
    validate: validatePipelineBlocks,
  });

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
