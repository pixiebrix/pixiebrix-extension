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

import React, { useCallback, useEffect, useMemo } from "react";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { useField, useFormikContext } from "formik";
import {
  ServiceKeyVar,
  RegistryId,
  SafeString,
  Schema,
  ServiceDependency,
  OutputKey,
} from "@/core";
import {
  createTypePredicate,
  fieldLabel,
} from "@/components/fields/fieldUtils";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { useAuthOptions } from "@/hooks/auth";
import { AuthOption } from "@/auth/authTypes";
import { produce } from "immer";
import { PACKAGE_REGEX } from "@/types/helpers";
import { freshIdentifier } from "@/utils";
import { browser } from "webextension-polyfill-ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloud } from "@fortawesome/free-solid-svg-icons";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import { isEmpty } from "lodash";

const DEFAULT_SERVICE_OUTPUT_KEY = "service" as OutputKey;

export const SERVICE_FIELD_REFS = [
  "https://app.pixiebrix.com/schemas/service#/definitions/configuredServiceOrVar",
  "https://app.pixiebrix.com/schemas/service#/definitions/configuredService",
];

export const SERVICE_BASE_SCHEMA =
  "https://app.pixiebrix.com/schemas/services/";

const SERVICE_ID_REGEX = /^https:\/\/app\.pixiebrix\.com\/schemas\/services\/(?<id>\S+)$/;

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

function extractServiceIds(schema: Schema): RegistryId[] {
  if ("$ref" in schema) {
    const match = SERVICE_ID_REGEX.exec(schema.$ref ?? "");
    return match ? [match.groups.id as RegistryId] : [];
  }

  if ("anyOf" in schema) {
    return schema.anyOf
      .filter((x) => x !== false)
      .flatMap((x) => extractServiceIds(x as Schema));
  }

  throw new Error("Expected $ref or anyOf in schema for service");
}

function keyToFieldValue(key: OutputKey): ServiceKeyVar {
  return key == null ? null : (`@${key}` as ServiceKeyVar);
}

/**
 * A schema-driven Service Selector that automatically maintains the services form state (and output keys)
 * @see ServiceDependency
 */
const ServiceField: React.FunctionComponent<
  SchemaFieldProps<ServiceKeyVar> & {
    /** Set the value of the field on mount to the service already selected, or the only available credential (default=true) */
    detectDefault?: boolean;
  }
> = ({ label, detectDefault = true, schema, ...props }) => {
  const [authOptions] = useAuthOptions();

  const [{ value, ...field }, , helpers] = useField<ServiceKeyVar>(props);

  const { values: root, setValues } = useFormikContext<{
    services: ServiceDependency[];
  }>();

  const { serviceIds, options } = useMemo(() => {
    const serviceIds = extractServiceIds(schema);
    return {
      serviceIds,
      options: isEmpty(serviceIds)
        ? authOptions
        : authOptions.filter((x) => serviceIds.includes(x.serviceId)),
    };
  }, [authOptions, schema]);

  const option = useMemo(() => {
    const dependency =
      value == null
        ? null
        : root.services.find((x) => keyToFieldValue(x.outputKey) === value);

    return dependency == null
      ? null
      : authOptions.find((x) => x.value === dependency.config);
  }, [root.services, authOptions, value]);

  const onChange = useCallback(
    (option: AuthOption) => {
      // Key Assumption: only one service of each type is configured. If a user changes the auth for one brick,
      // it changes the auth for all the bricks.

      let outputKey: OutputKey;

      setValues(
        produce(root, (draft) => {
          // Some bricks support alternative service ids, so need to check all of them
          const match = draft.services.find((dependency) =>
            serviceIds.includes(dependency.id)
          );
          if (match) {
            console.debug(
              "Dependency already exists for %s, switching service auth",
              option.serviceId,
              { root }
            );
            match.id = option.serviceId;
            match.config = option.value;
            outputKey = match.outputKey;
          } else {
            console.debug(
              "Dependency does not exist for %s, creating dependency",
              option.serviceId,
              { root }
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
        })
      );

      console.debug("Setting value to %s", outputKey);
      helpers.setValue(keyToFieldValue(outputKey));
    },
    [root, helpers, setValues, serviceIds]
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
          // Try defaulting to the only option available
          onChange(options[0]);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount
    [serviceIds, options]
  );

  console.debug("Render ServiceField", { option, options });

  return (
    <ConnectedFieldTemplate
      name={field.name}
      label={label ?? fieldLabel(field.name)}
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
      options={options}
      onChange={onChange}
      value={option?.value}
    />
  );
};

export default ServiceField;
