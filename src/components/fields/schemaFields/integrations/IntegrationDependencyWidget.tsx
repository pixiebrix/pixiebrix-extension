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

import React, { useCallback, useMemo } from "react";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { PACKAGE_REGEX } from "@/types/helpers";
import { type AuthOption } from "@/auth/authTypes";
import {
  type IntegrationsFormSlice,
  keyToFieldValue,
  produceExcludeUnusedDependencies,
} from "@/components/fields/schemaFields/integrations/integrationDependencyFieldUtils";
import { produce } from "immer";
import { setIn, useField, useFormikContext } from "formik";
import { useAuthOptions } from "@/hooks/auth";
import { extractIntegrationIds } from "@/services/integrationUtils";
import { isEmpty, isEqual, unset } from "lodash";
import { type SelectWidgetOnChange } from "@/components/form/widgets/SelectWidget";
import IntegrationAuthSelectWidget from "@/components/fields/schemaFields/integrations/IntegrationAuthSelectWidget";
import {
  type Expression,
  type OutputKey,
  type ServiceVarRef,
} from "@/types/runtimeTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type SafeString, type UUID } from "@/types/stringTypes";
import { type IntegrationDependency } from "@/types/integrationTypes";
import { fallbackValue } from "@/utils/asyncStateUtils";
import { freshIdentifier } from "@/utils/variableUtils";
import useAsyncEffect from "use-async-effect";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";

export type IntegrationDependencyWidgetProps = SchemaFieldProps & {
  /** Set the value of the field on mount to the integration auth already selected, or the only available credential (default=true) */
  detectDefault?: boolean;
};

const DEFAULT_INTEGRATION_OUTPUT_KEY = "integration" as OutputKey;

export function defaultOutputKey(
  integrationId: RegistryId | null,
  otherOutputKeys: OutputKey[]
): OutputKey {
  let rawKey = DEFAULT_INTEGRATION_OUTPUT_KEY;

  if (integrationId) {
    const match = PACKAGE_REGEX.exec(integrationId);
    rawKey = (match.groups.collection?.replace(".", "_").replace("-", "_") ??
      DEFAULT_INTEGRATION_OUTPUT_KEY) as OutputKey;
  }

  // OK to cast to SafeString since defaultOutputKey checks it's a valid PACKAGE_REGEX
  return freshIdentifier(
    rawKey as unknown as SafeString,
    otherOutputKeys
  ) as OutputKey;
}

/**
 * Return the auth id corresponding to an integration variable usage
 * @see AuthOption.value
 * @see IntegrationDependency.config
 */
function lookupAuthId(
  dependencies: IntegrationDependency[],
  authOptions: AuthOption[],
  value: ServiceVarRef
): UUID {
  const dependency =
    value == null
      ? null
      : dependencies.find(
          ({ outputKey }) => keyToFieldValue(outputKey).__value__ === value
        );

  return dependency == null
    ? null
    : authOptions.find(({ value }) => value === dependency.configId)?.value;
}

/**
 * Key assumptions/limitations:
 * - We're only supporting one integration of each type at this time. If you
 *   change one of the auths for an integration, it will change the other auths
 *   for that integration too
 */
function setIntegrationAuthSelectionForField(
  state: IntegrationsFormSlice,
  fieldName: string,
  authOption: AuthOption
): IntegrationsFormSlice {
  let outputKey: OutputKey;

  let nextState = produce(state, (draft) => {
    // Unlike when defaulting, we don't need to check against the registry ids from the schema because this method
    // will only be called with an allowed option.
    const match = draft.integrationDependencies.find(
      ({ integrationId }) => integrationId === authOption.serviceId
    );

    if (match) {
      console.debug(
        "Dependency already exists for %s, switching integration auth",
        authOption.serviceId,
        { state }
      );
      match.configId = authOption.value;
      outputKey = match.outputKey;
    } else {
      console.debug(
        "Dependency does not exist for %s, creating dependency",
        authOption.serviceId,
        { state }
      );
      outputKey = defaultOutputKey(
        authOption.serviceId,
        draft.integrationDependencies.map((x) => x.outputKey)
      );
      draft.integrationDependencies.push({
        integrationId: authOption.serviceId,
        outputKey,
        configId: authOption.value,
      });
    }
  });

  // Update field value before calling produceExcludeUnusedDependencies, otherwise it will see the stale service var
  nextState = setIn(nextState, fieldName, keyToFieldValue(outputKey));

  // Perform cleanup of the service dependencies
  nextState = produceExcludeUnusedDependencies(nextState);

  return nextState;
}

function clearIntegrationSelection(
  state: IntegrationsFormSlice,
  fieldName: string,
  isRequired?: boolean
): IntegrationsFormSlice {
  const nextState = produce(state, (draft) => {
    if (isRequired) {
      setIn(draft, fieldName, null);
    } else {
      unset(draft, fieldName);
    }
  });
  return produceExcludeUnusedDependencies(nextState);
}

const NO_AUTH_OPTIONS = Object.freeze([] as AuthOption[]);

// The only reason these inputs are optional is for tests, need to investigate better mocking instead
// @see BotOptions.test.ts
const makeSelectedEventPayload = (
  authOption?: AuthOption,
  isUserAction?: boolean
) => {
  if (!authOption) {
    return {};
  }

  return {
    integration_id: authOption.serviceId,
    is_user_action: isUserAction,
    auth_label: authOption.label,
    auth_sharing_type: authOption.sharingType,
    auth_is_local: authOption.local,
  };
};

/**
 * A schema-driven Service Selector that automatically maintains the services form state (and output keys)
 * @see IntegrationDependency
 */
const IntegrationDependencyWidget: React.FC<
  IntegrationDependencyWidgetProps
> = ({ detectDefault = true, ...props }) => {
  const { schema, isRequired } = props;
  const { data: authOptions, refetch: refreshOptions } = fallbackValue(
    useAuthOptions(),
    NO_AUTH_OPTIONS
  );
  const { values: rootValues, setValues: setRootValues } =
    useFormikContext<IntegrationsFormSlice>();
  const [{ value, ...field }, , helpers] =
    useField<Expression<ServiceVarRef>>(props);

  const { validDefaultIntegrationIds, options } = useMemo(() => {
    // Registry ids specified by the schema, or returns empty if any allowed
    const schemaServiceIds = extractIntegrationIds(schema);

    return {
      validDefaultIntegrationIds: schemaServiceIds,
      options: isEmpty(schemaServiceIds)
        ? authOptions
        : authOptions.filter((x) => schemaServiceIds.includes(x.serviceId)),
    };
  }, [authOptions, schema]);

  const onChange: SelectWidgetOnChange<AuthOption> = useCallback(
    async ({ target: { value, options } }) => {
      let newState: IntegrationsFormSlice;
      // Value will be null when the selection is "cleared"
      if (value == null) {
        newState = clearIntegrationSelection(
          rootValues,
          field.name,
          isRequired
        );
        reportEvent(Events.INTEGRATION_WIDGET_CLEAR);
      } else {
        const authOption = options.find((x) => x.value === value);
        newState = setIntegrationAuthSelectionForField(
          rootValues,
          field.name,
          authOption
        );
        reportEvent(
          Events.INTEGRATION_WIDGET_SELECT,
          makeSelectedEventPayload(authOption, true)
        );
      }

      await setRootValues(newState);
      // eslint-disable-next-line unicorn/no-useless-undefined -- need to clear the error
      helpers.setError(undefined);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- formik helpers change on every render
    [rootValues, setRootValues, field.name]
  );

  useAsyncEffect(
    async () => {
      if (value == null && detectDefault) {
        if (rootValues.integrationDependencies == null) {
          throw new TypeError(
            "integrationDependencies prop does not exist on base form state. Is your Formik state configured properly?"
          );
        }

        // Match a permitted integration id that's already configured by another brick
        const match = rootValues.integrationDependencies.find(
          ({ integrationId }) =>
            validDefaultIntegrationIds.includes(integrationId)
        );

        if (match?.outputKey) {
          // If the service is already being used, default to the currently configured auth
          console.debug(
            "Dependency already exists for %s, using output key %s",
            match.integrationId,
            match.outputKey,
            { rootValues, match }
          );
          await helpers.setValue(keyToFieldValue(match.outputKey));
          const authOption = authOptions.find(
            ({ value }) => value === match.configId
          );
          reportEvent(
            Events.INTEGRATION_WIDGET_SELECT,
            makeSelectedEventPayload(authOption, false)
          );
        } else if (options.length === 1) {
          // This condition is only true when the auth services have been filtered by the schema
          console.debug("Defaulting to only integration option", {
            option: options[0],
            options,
          });
          // Try defaulting to the only option available.
          const authOption = options[0];
          const newState = setIntegrationAuthSelectionForField(
            rootValues,
            field.name,
            authOption
          );
          await setRootValues(newState);
          reportEvent(
            Events.INTEGRATION_WIDGET_SELECT,
            makeSelectedEventPayload(authOption, false)
          );
        }
      } else if (
        value &&
        !rootValues.integrationDependencies.some((dependency) =>
          isEqual(keyToFieldValue(dependency.outputKey), value)
        )
      ) {
        // This currently happens when a brick is copy-pasted into a separate extension
        // that does not yet have root.integrationDependencies configured, but already
        // has the integration dependency key set up in the (copied) BrickConfig.
        // Clearing the value here allows the preceding if-branch to execute again, which
        // runs the "detectDefault" logic and then calls the integration-dependency-select
        // change handler, which in turn will configure root.integrationDependencies
        // properly for the extension.
        await helpers.setValue(null);
      }
    },
    // Only run on mount
    [validDefaultIntegrationIds, options]
  );

  // The SelectWidget re-looks up the option based on the value
  const selectedValue = useMemo(
    () =>
      value?.__value__
        ? lookupAuthId(
            rootValues.integrationDependencies,
            authOptions,
            value.__value__
          )
        : null,
    [authOptions, rootValues.integrationDependencies, value?.__value__]
  );

  return (
    <IntegrationAuthSelectWidget
      name={field.name}
      id={field.name}
      value={selectedValue}
      onChange={onChange}
      options={options}
      refreshOptions={() => {
        refreshOptions();
        reportEvent(Events.INTEGRATION_WIDGET_REFRESH);
      }}
      isClearable={!isRequired}
    />
  );
};

export default IntegrationDependencyWidget;
