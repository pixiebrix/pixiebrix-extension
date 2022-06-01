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
import { selectTraceError } from "@/pageEditor/slices/runtimeSelectors";
import { useCallback } from "react";
import { BlockPipeline } from "@/blocks/types";
import { useField, useFormikContext, setNestedObjectValues } from "formik";
import { TraceError } from "@/telemetry/trace";
import { useAsyncEffect } from "use-async-effect";
import validateOutputKey from "@/pageEditor/validation/validateOutputKey";
import validateRenderers from "@/pageEditor/validation/validateRenderers";
import applyTraceError from "@/pageEditor/validation/applyTraceError";
import { get, isEmpty } from "lodash";
import {
  FormikError,
  FormikErrorTree,
} from "@/pageEditor/tabs/editTab/editTabTypes";
import { TypedBlockMap } from "@/blocks/registry";
import { ExtensionPointType } from "@/extensionPoints/types";
import validateStringTemplates from "@/pageEditor/validation/validateStringTemplates";
import { RegistryId, UUID } from "@/core";
import { joinName } from "@/utils";
import { getPipelinePropNames } from "@/pageEditor/utils";

const PIPELINE_BLOCKS_FIELD_NAME = "extension.blockPipeline";

/**
 * The map of pipeline blocks. The key is the instanceId of the block.
 */
type PipelineMap = Record<
  UUID,
  {
    blockId: RegistryId;
    fieldName: string;
  }
>;

function flattenPipeline(
  blockPipeline: BlockPipeline,
  parentFieldName: string,
  pipelineMap: PipelineMap
) {
  for (const [index, blockConfig] of Object.entries(blockPipeline)) {
    const { instanceId, id } = blockConfig;
    const fieldName = joinName(parentFieldName, index);
    pipelineMap[instanceId] = {
      blockId: id,
      fieldName,
    };

    for (const subPipelineField of getPipelinePropNames(blockConfig)) {
      const subPipelineAccessor = ["config", subPipelineField, "__value__"];
      const subPipeline = get(blockConfig, subPipelineAccessor);
      const subPipelineFieldName = joinName(fieldName, ...subPipelineAccessor);
      flattenPipeline(subPipeline, subPipelineFieldName, pipelineMap);
    }
  }
}

function usePipelineField(
  allBlocks: TypedBlockMap,
  extensionPointType: ExtensionPointType
): {
  blockPipeline: BlockPipeline;
  pipelineMap: PipelineMap;
  blockPipelineErrors: FormikError;
  errorTraceEntry: TraceError;
} {
  const errorTraceEntry = useSelector(selectTraceError);

  const validatePipelineBlocks = useCallback(
    (pipeline: BlockPipeline): void | FormikErrorTree => {
      const formikErrors: FormikErrorTree = {};

      validateOutputKey(formikErrors, pipeline, allBlocks);
      validateRenderers(formikErrors, pipeline, allBlocks, extensionPointType);
      validateStringTemplates(formikErrors, pipeline);
      applyTraceError(formikErrors, errorTraceEntry, pipeline);

      return isEmpty(formikErrors) ? undefined : formikErrors;
    },
    [allBlocks, extensionPointType, errorTraceEntry]
  );

  const [{ value: blockPipeline }, { error: blockPipelineErrors }] =
    useField<BlockPipeline>({
      name: PIPELINE_BLOCKS_FIELD_NAME,
      // @ts-expect-error working with nested errors
      validate: validatePipelineBlocks,
    });

  // TODO remove this and use the map from Redux
  const pipelineMap: PipelineMap = {};
  flattenPipeline(blockPipeline, PIPELINE_BLOCKS_FIELD_NAME, pipelineMap);

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
    pipelineMap,
    blockPipelineErrors,
    errorTraceEntry,
  };
}

export default usePipelineField;
