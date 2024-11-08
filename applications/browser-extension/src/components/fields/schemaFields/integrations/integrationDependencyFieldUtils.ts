/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { type ModComponentFormState } from "../../../../pageEditor/starterBricks/formStateTypes";
import { type Draft, produce } from "immer";
import {
  isDeferExpression,
  isExpression,
  isPipelineExpression,
  isVarExpression,
} from "../../../../utils/expressionUtils";
import { isEmpty } from "lodash";
import { makeVariableExpression } from "../../../../utils/variableUtils";

export type IntegrationsFormSlice = Pick<
  ModComponentFormState,
  "integrationDependencies" | "modComponent"
>;

/**
 * Regex matching identifiers generated via defaultOutputKey
 */
const SERVICE_VAR_REGEX = /^@\w+$/;

// TODO: rewrite using PipelineExpressionVisitor
function deepFindIntegrationDependencyVariables(
  obj: unknown,
  variables: Set<string>,
) {
  if (typeof obj !== "object" || obj == null) {
    return;
  }

  if (!isExpression(obj)) {
    for (const value of Object.values(obj)) {
      deepFindIntegrationDependencyVariables(value, variables);
    }

    return;
  }

  // Don't need to handle Nunjucks/Text Template expressions, because they should never reference services
  if (isVarExpression(obj)) {
    if (SERVICE_VAR_REGEX.test(obj.__value__)) {
      variables.add(obj.__value__);
    }

    return;
  }

  if (isPipelineExpression(obj) || isDeferExpression(obj)) {
    deepFindIntegrationDependencyVariables(obj.__value__, variables);
  }
}

/**
 * Return set of integration dependency variables referenced by the mod component,
 * including the `@`-prefixes
 * @internal
 */
export function selectIntegrationDependencyVariables(
  state: Pick<ModComponentFormState, "modComponent">,
): Set<string> {
  const variables = new Set<string>();
  deepFindIntegrationDependencyVariables(
    state.modComponent.brickPipeline,
    variables,
  );
  return variables;
}

/**
 * Filter the unused dependencies from a draft in-place
 */
export function removeUnusedDependencies(draft: Draft<IntegrationsFormSlice>) {
  if (isEmpty(draft.integrationDependencies)) {
    return;
  }

  const used = selectIntegrationDependencyVariables(draft);
  draft.integrationDependencies = draft.integrationDependencies.filter(
    ({ outputKey }) => used.has(makeVariableExpression(outputKey).__value__),
  );
}

/**
 * Return a new copy of state with unused dependencies excluded
 * @param state the form state
 */
export function produceExcludeUnusedDependencies<
  T extends IntegrationsFormSlice = IntegrationsFormSlice,
>(state: T): T {
  return produce<T>(state, removeUnusedDependencies);
}
