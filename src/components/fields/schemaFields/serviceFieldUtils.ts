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

import { Expression, OutputKey, ServiceKeyVar } from "@/core";
import { FormState } from "@/pageEditor/pageEditorTypes";
import {
  isExpression,
  isPipelineExpression,
  PipelineExpression,
} from "@/runtime/mapArgs";
import { UnknownObject } from "@/types";
import { produce } from "immer";
import { castArray, uniq } from "lodash";

export type ServiceSlice = Pick<FormState, "services" | "extension">;

/**
 * Regex matching identifiers generated via defaultOutputKey
 */
const SERVICE_VAR_REGEX = /^@\w+$/;

/**
 * Return the next level of pipeline expressions. Does not recurse inside the pipeline expression.
 */
export function selectPipelines(obj: unknown): PipelineExpression[] {
  if (typeof obj !== "object" || obj == null) {
    return [];
  }

  // NOTE: not recursing insides the pipeline expression. The caller is responsible for calling recursively
  if (isPipelineExpression(obj)) {
    return [obj];
  }

  // This works on Arrays too, since arrays are objects
  return Object.values(obj).flatMap((x) => selectPipelines(x));
}

function selectVariablesFromConfig(config: UnknownObject): string[] {
  const configValues = Object.values(config);

  const variableExpressions = configValues.filter(
    (x) => isExpression(x) && x.__type__ === "var"
  ) as Expression[];

  // Service variables and any other variable expressions without `.` path separators
  const directVariables = variableExpressions
    .map((x) => x.__value__)
    .filter((value) => SERVICE_VAR_REGEX.test(value));

  // Get the next level of !pipeline expressions and recurse to get the variables they reference
  const pipelines: PipelineExpression[] = configValues.flatMap((value) =>
    selectPipelines(value)
  );
  const nestedPipelineVariables = pipelines.flatMap(({ __value__: configs }) =>
    configs.flatMap(({ config }) => selectVariablesFromConfig(config))
  );

  return uniq([...directVariables, ...nestedPipelineVariables]);
}

/**
 * Return set of service variables referenced by the extension. Variables include the `@`-prefix
 */
export function selectVariables(
  state: Pick<FormState, "extension">
): Set<string> {
  const pipeline = castArray(state.extension.blockPipeline ?? []);
  const identifiers = pipeline.flatMap((x) =>
    selectVariablesFromConfig(x.config)
  );
  return new Set(identifiers);
}

export function keyToFieldValue(key: OutputKey): Expression<ServiceKeyVar> {
  const value = key == null ? null : (`@${key}` as ServiceKeyVar);
  return {
    __type__: "var",
    __value__: value,
  };
}

/**
 * Return a new copy of state with unused dependencies excluded
 * @param state the form state
 */
export function produceExcludeUnusedDependencies<
  T extends ServiceSlice = ServiceSlice
>(state: T): T {
  const used = selectVariables(state);

  console.log("vars", used);
  return produce(state, (draft) => {
    draft.services = draft.services.filter((x) =>
      used.has(keyToFieldValue(x.outputKey).__value__)
    );
  });
}
