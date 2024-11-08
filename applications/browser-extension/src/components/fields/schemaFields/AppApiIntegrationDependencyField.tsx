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

import type React from "react";
import { useField } from "formik";
import {
  type Expression,
  type IntegrationDependencyVarRef,
} from "../../../types/runtimeTypes";
import useAsyncEffect from "use-async-effect";
import {
  PIXIEBRIX_INTEGRATION_ID,
  PIXIEBRIX_OUTPUT_KEY,
} from "../../../integrations/constants";

import { makeVariableExpression } from "../../../utils/variableUtils";
import pixiebrixIntegrationDependencyFactory from "../../../integrations/util/pixiebrixIntegrationDependencyFactory";
import { type IntegrationDependency } from "../../../integrations/integrationTypes";

/**
 * Schema-based field for the PixieBrix API (@pixiebrix/api).
 *
 * - Does not render a DOM element
 * - Ensures a @pixiebrix/api dependency is included for the extension
 */
const AppApiIntegrationDependencyField: React.FunctionComponent<{
  name: string;
}> = ({ name }) => {
  const [
    { value: outputKeyFieldValue },
    ,
    { setValue: setOutputKeyFieldValue },
  ] = useField<Expression<IntegrationDependencyVarRef>>(name);
  // Integration dependencies live at the root of the form values
  const [
    { value: integrationDependenciesFieldValue },
    ,
    { setValue: setIntegrationDependenciesFieldValue },
  ] = useField<IntegrationDependency[]>("integrationDependencies");

  const missingDependency = !integrationDependenciesFieldValue.some(
    ({ integrationId }) => integrationId === PIXIEBRIX_INTEGRATION_ID,
  );
  const outputKeyNotSet = !outputKeyFieldValue;

  useAsyncEffect(async () => {
    if (missingDependency) {
      console.debug("Adding PixieBrix API dependency");
      await setIntegrationDependenciesFieldValue([
        ...integrationDependenciesFieldValue,
        pixiebrixIntegrationDependencyFactory(),
      ]);
    }

    if (outputKeyNotSet) {
      await setOutputKeyFieldValue(
        makeVariableExpression(PIXIEBRIX_OUTPUT_KEY),
      );
    }
  }, [missingDependency, outputKeyNotSet]);

  return null;
};

export default AppApiIntegrationDependencyField;
