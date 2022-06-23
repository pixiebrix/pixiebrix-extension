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
  isVarExpression,
} from "@/runtime/mapArgs";
import { produce } from "immer";

export type ServiceSlice = Pick<FormState, "services" | "extension">;

/**
 * Regex matching identifiers generated via defaultOutputKey
 */
const SERVICE_VAR_REGEX = /^@\w+$/;

function deepFindServiceVariables(obj: unknown, variables: Set<string>) {
  if (typeof obj !== "object" || obj == null) {
    return;
  }

  if (!isExpression(obj)) {
    for (const value of Object.values(obj)) {
      deepFindServiceVariables(value, variables);
    }

    return;
  }

  if (isVarExpression(obj)) {
    if (SERVICE_VAR_REGEX.test(obj.__value__)) {
      variables.add(obj.__value__);
    }

    return;
  }

  if (isPipelineExpression(obj)) {
    deepFindServiceVariables(obj.__value__, variables);
  }
}

/**
 * Return set of service variables referenced by the extension. Variables include the `@`-prefix
 */
export function selectServiceVariables(
  state: Pick<FormState, "extension">
): Set<string> {
  const variables = new Set<string>();
  deepFindServiceVariables(state.extension.blockPipeline, variables);
  return variables;
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
  const used = selectServiceVariables(state);

  console.log("vars", used);
  return produce(state, (draft) => {
    draft.services = draft.services.filter((x) =>
      used.has(keyToFieldValue(x.outputKey).__value__)
    );
  });
}
