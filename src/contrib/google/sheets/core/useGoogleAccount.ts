/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import {
  type IntegrationDependency,
  type SanitizedIntegrationConfig,
} from "@/types/integrationTypes";
import { type FetchableAsyncState } from "@/types/sliceTypes";
import { useField, useFormikContext } from "formik";
import { type ServiceSlice } from "@/components/fields/schemaFields/serviceFieldUtils";
import { type Expression } from "@/types/runtimeTypes";
import { joinName } from "@/utils";
import useAsyncState from "@/hooks/useAsyncState";
import hash from "object-hash";
import { services } from "@/background/messenger/api";
import { getErrorMessage } from "@/errors/errorHelpers";
import { isVarExpression } from "@/utils/expressionUtils";

export async function findGoogleAccountIntegrationConfig(
  servicesValue: IntegrationDependency[],
  googleAccountValue: Expression | undefined
): Promise<SanitizedIntegrationConfig | null> {
  if (!isVarExpression(googleAccountValue)) {
    return null;
  }

  const serviceOutputKey = googleAccountValue.__value__.replace(/^@/, "");
  const integrationDependency = servicesValue.find(
    (service) => service.outputKey === serviceOutputKey
  );

  if (integrationDependency == null) {
    throw new Error(
      `Could not find integration configuration with output key ${serviceOutputKey}`
    );
  }

  return services.locate(
    integrationDependency.id,
    integrationDependency.config
  );
}

/**
 * Hook to get the Google account for a block config assumed to be within a
 * Formik form with a standard mod form state
 * @see ModComponentFormState
 */
function useGoogleAccount(
  blockConfigPath: string
): FetchableAsyncState<SanitizedIntegrationConfig | null> {
  const {
    values: { services: servicesValue },
  } = useFormikContext<ServiceSlice>();

  const [{ value: fieldValue }, , { setError }] = useField<
    Expression | undefined
  >(joinName(blockConfigPath, "googleAccount"));

  return useAsyncState(async () => {
    try {
      return await findGoogleAccountIntegrationConfig(
        servicesValue,
        fieldValue
      );
    } catch (error: unknown) {
      setError(getErrorMessage(error));
      return null;
    }
  }, [hash({ servicesValue })]);
}

export default useGoogleAccount;
