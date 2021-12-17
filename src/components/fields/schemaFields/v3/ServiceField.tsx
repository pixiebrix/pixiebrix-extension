/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { ChangeEvent, useCallback, useEffect, useMemo } from "react";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { setIn, useField, useFormikContext } from "formik";
import {
  Expression,
  OutputKey,
  RegistryId,
  SafeString,
  ServiceDependency,
  ServiceKeyVar,
  UUID,
} from "@/core";
import { createTypePredicate } from "@/components/fields/fieldUtils";
import { useAuthOptions } from "@/hooks/auth";
import { AuthOption } from "@/auth/authTypes";
import { produce } from "immer";
import { PACKAGE_REGEX } from "@/types/helpers";
import { freshIdentifier } from "@/utils";
import browser from "webextension-polyfill";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloud } from "@fortawesome/free-solid-svg-icons";
import SelectWidget, {
  SelectLike,
  SelectWidgetOnChange,
} from "@/components/form/widgets/SelectWidget";
import { castArray, isEmpty } from "lodash";
import FieldTemplate from "@/components/form/FieldTemplate";
import {
  extractServiceIds,
  SERVICE_BASE_SCHEMA,
  SERVICE_FIELD_REFS,
} from "@/services/serviceUtils";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import { makeLabelForSchemaField } from "@/components/fields/schemaFields/schemaFieldUtils";
import { isExpression } from "@/runtime/mapArgs";

const DEFAULT_SERVICE_OUTPUT_KEY = "service" as OutputKey;

/**
 * Regex matching identifiers generated via defaultOutputKey
 */
const SERVICE_VAR_REGEX = /^@\w+$/;

export const isServiceField = createTypePredicate(
  (x) =>
    x.$ref?.startsWith(SERVICE_BASE_SCHEMA) ||
    SERVICE_FIELD_REFS.includes(x.$ref)
);

function defaultOutputKey(
  serviceId: RegistryId | null,
  otherOutputKeys: OutputKey[]
): OutputKey {
  let rawKey = DEFAULT_SERVICE_OUTPUT_KEY;

  if (serviceId) {
    const match = PACKAGE_REGEX.exec(serviceId);
    rawKey = (match.groups.collection?.replace(".", "_").replace("-", "_") ??
      DEFAULT_SERVICE_OUTPUT_KEY) as OutputKey;
  }

  // OK to cast to SafeString since defaultOutputKey checks it's a valid PACKAGE_REGEX
  return freshIdentifier(
    (rawKey as unknown) as SafeString,
    otherOutputKeys
  ) as OutputKey;
}

export function keyToFieldValue(key: OutputKey): Expression<ServiceKeyVar> {
  const value = key == null ? null : (`@${key}` as ServiceKeyVar);
  return {
    __type__: "var",
    __value__: value,
  };
}

export type ServiceSlice = Pick<FormState, "services" | "extension">;

/**
 * Return the auth id corresponding to a service variable usage
 * @see AuthOption.value
 * @see ServiceDependency.config
 */
function lookupAuthId(
  dependencies: ServiceDependency[],
  authOptions: AuthOption[],
  value: ServiceKeyVar
): UUID {
  const dependency =
    value == null
      ? null
      : dependencies.find(
          (x) => keyToFieldValue(x.outputKey).__value__ === value
        );

  return dependency == null
    ? null
    : authOptions.find((x) => x.value === dependency.config)?.value;
}

function selectTopLevelVars(state: Pick<FormState, "extension">): Set<string> {
  const pipeline = castArray(state.extension.blockPipeline ?? []);
  const identifiers = pipeline.flatMap((blockConfig) => {
    const expressions = Object.values(blockConfig.config).filter(
      (x) => isExpression(x) && x.__type__ === "var"
    ) as Expression[];
    const values = expressions.map((x) => x.__value__);
    return values.filter((value) => SERVICE_VAR_REGEX.test(value));
  });

  return new Set(identifiers);
}

/**
 * Return a new copy of state with unused dependencies excluded
 * @param state the form state
 */
export function produceExcludeUnusedDependencies<
  T extends ServiceSlice = ServiceSlice
>(state: T): T {
  const used = selectTopLevelVars(state);
  return produce(state, (draft) => {
    draft.services = draft.services.filter((x) =>
      used.has(keyToFieldValue(x.outputKey).__value__)
    );
  });
}

/**
 * Key assumptions/limitations:
 * - We're only supporting one service of each type at this time. If you change one of the auths for a service, it will
 * change the other auths for that service too
 */
// eslint-disable-next-line max-params -- internal method where all the arguments have different types
function produceServiceAuths(
  state: ServiceSlice,
  fieldName: string,
  serviceId: UUID,
  serviceIds: RegistryId[],
  options: AuthOption[]
) {
  const option = options.find((x) => x.value === serviceId);

  let outputKey: OutputKey;

  let nextState = produce(state, (draft) => {
    // Some bricks support alternative service ids, so need to check all of them
    const match = draft.services.find((dependency) =>
      serviceIds.includes(dependency.id)
    );

    if (match) {
      console.debug(
        "Dependency already exists for %s, switching service auth",
        option.serviceId,
        { state }
      );
      match.id = option.serviceId;
      match.config = option.value;
      outputKey = match.outputKey;
    } else {
      console.debug(
        "Dependency does not exist for %s, creating dependency",
        option.serviceId,
        { state }
      );
      outputKey = defaultOutputKey(
        option.serviceId,
        draft.services.map((x) => x.outputKey)
      );
      draft.services.push({
        id: option.serviceId,
        outputKey,
        config: option.value,
      });
    }
  });

  // Update field value before calling produceExcludeUnusedDependencies, otherwise it will see the stale service var
  nextState = setIn(nextState, fieldName, keyToFieldValue(outputKey));

  // Perform cleanup of the service dependencies
  nextState = produceExcludeUnusedDependencies(nextState);

  return nextState;
}

function clearServiceSelection(
  state: ServiceSlice,
  fieldName: string
): ServiceSlice {
  const nextState = setIn(state, fieldName, null);
  return produceExcludeUnusedDependencies(nextState);
}

/**
 * A schema-driven Service Selector that automatically maintains the services form state (and output keys)
 * @see ServiceDependency
 */
const ServiceField: React.FunctionComponent<
  SchemaFieldProps & {
    /** Set the value of the field on mount to the service already selected, or the only available credential (default=true) */
    detectDefault?: boolean;
  }
> = ({ detectDefault = true, ...props }) => {
  const { schema } = props;
  const [authOptions] = useAuthOptions();
  const {
    values: root,
    setValues: setRootValues,
  } = useFormikContext<ServiceSlice>();
  const [{ value, ...field }, meta, helpers] = useField<
    Expression<ServiceKeyVar>
  >(props);

  const { serviceIds, options } = useMemo(() => {
    const serviceIds = extractServiceIds(schema);
    return {
      serviceIds,
      options: isEmpty(serviceIds)
        ? authOptions
        : authOptions.filter((x) => serviceIds.includes(x.serviceId)),
    };
  }, [authOptions, schema]);

  const onChange: SelectWidgetOnChange<AuthOption> = useCallback(
    ({ target: { value, options } }) => {
      // Value will be null when the selection is "cleared"
      const newState =
        value == null
          ? clearServiceSelection(root, field.name)
          : produceServiceAuths(root, field.name, value, serviceIds, options);
      setRootValues(newState);
    },
    [root, setRootValues, serviceIds, field.name]
  );

  useEffect(
    () => {
      if (value == null && detectDefault) {
        const match = root.services.find((service) =>
          serviceIds.includes(service.id)
        );
        if (match?.outputKey) {
          // If the service is already being used, default to the currently configured auth
          console.debug(
            "Dependency already exists for %s, using output key %s",
            match.id,
            match.outputKey,
            { root, match }
          );
          helpers.setValue(keyToFieldValue(match.outputKey));
        } else if (options.length === 1) {
          console.debug("Defaulting to only integration option", {
            option: options[0],
            options,
          });
          // Try defaulting to the only option available. Use onChange instead of helpers.setValue b/c it automatically
          // updates the services part of the form state
          onChange({
            target: { value: options[0].value, name: field.name, options },
          } as ChangeEvent<SelectLike<AuthOption>>);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount
    [serviceIds, options]
  );

  // The SelectWidget re-looks up the option based on the value
  const selectedValue = useMemo(
    () =>
      value?.__value__
        ? lookupAuthId(root.services, authOptions, value.__value__)
        : null,
    [authOptions, root.services, value?.__value__]
  );

  // Use FieldTemplate here directly b/c this component is mapping between the Formik state and the options for the
  // select widget.
  return (
    <FieldTemplate
      name={field.name}
      label={makeLabelForSchemaField(props)}
      description={
        <span>
          A configured integration.{" "}
          <a
            href={`${browser.runtime.getURL("options.html")}#/services`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FontAwesomeIcon icon={faCloud} />
            &nbsp;Configure additional integrations on the Integrations page
          </a>
        </span>
      }
      as={SelectWidget}
      isClearable
      options={options}
      value={selectedValue}
      onChange={onChange}
      error={meta.error}
      touched={meta.touched}
    />
  );
};

export default ServiceField;
