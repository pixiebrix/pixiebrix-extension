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

import { Expression } from "@/core";
import { FormState } from "@/pageEditor/pageEditorTypes";
import {
  isExpression,
  isPipelineExpression,
  PipelineExpression,
} from "@/runtime/mapArgs";
import { UnknownObject } from "@/types";
import { castArray, flatMap } from "lodash";

/**
 * Regex matching identifiers generated via defaultOutputKey
 */
const SERVICE_VAR_REGEX = /^@\w+$/;

function selectPipelines(obj: unknown): PipelineExpression[] {
  if (typeof obj !== "object" || obj == null) {
    return [];
  }

  if (isPipelineExpression(obj)) {
    return [obj];
  }

  return Object.values(obj).flatMap((x) => selectPipelines(x));
}

function selectVarsFromConfig(config: UnknownObject): string[] {
  const configValues = Object.values(config);
  const expressions = configValues.filter(
    (x) => isExpression(x) && x.__type__ === "var"
  ) as Expression[];

  const values = expressions.map((x) => x.__value__);
  const servicesFromExpression = values.filter((value) =>
    SERVICE_VAR_REGEX.test(value)
  );

  const pipelines: PipelineExpression[] = flatMap(
    configValues,
    selectPipelines
  );
  const servicesFromPipeline = pipelines.flatMap((x) =>
    x.__value__.flatMap((y) => selectVarsFromConfig(y.config))
  );

  return [...servicesFromExpression, ...servicesFromPipeline];
}

export function selectVars(state: Pick<FormState, "extension">): Set<string> {
  const pipeline = castArray(state.extension.blockPipeline ?? []);
  const identifiers = pipeline.flatMap((x) => selectVarsFromConfig(x.config));

  return new Set(identifiers);
}
