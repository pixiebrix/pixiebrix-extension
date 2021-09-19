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

import React, { useEffect, useMemo } from "react";
import {
  BlockOptionProps,
  FieldRenderer,
} from "@/components/fields/blockOptions";
import { compact } from "lodash";
import {
  UIPATH_PROPERTIES,
  UIPATH_SERVICE_IDS,
} from "@/contrib/uipath/process";
import { Schema, SchemaProperties } from "@/core";
import { useField } from "formik";
import { useAsyncState } from "@/hooks/common";
import { proxyService } from "@/background/requests";
import { Button } from "react-bootstrap";
import { fieldLabel } from "@/components/fields/fieldUtils";
import { SchemaFieldProps } from "@/components/fields/propTypes";
import { parseAssemblyQualifiedName } from "csharp-helpers";
import useDependency from "@/services/useDependency";
import { BusinessError, getErrorMessage } from "@/errors";
import ServiceField from "@/components/fields/schemaFields/ServiceField";
import ChildObjectField from "@/components/fields/schemaFields/ChildObjectField";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import MultiSelectWidget from "@/devTools/editor/fields/MultiSelectWidget";
import SelectWidget from "@/devTools/editor/fields/SelectWidget";

type Argument = {
  name: string;
  type: string;
  required: boolean;
  hasDefault: boolean;
};

type ODataResponseData<TValue> = {
  "@odata.context": string;
  "@odata.count": number;
  value: TValue[];
};

type Robot = {
  MachineName: string;
  MachineId: number;
  Name: string;
  Username: string;
  Description: string;
  Type: string;
  Id: number;
};

type Release = {
  Key: string;
  ProcessKey: string;
  ProcessVersion: string;
  IsLatestVersion: boolean;
  Description: string;
  Name: string;
  Arguments: {
    // Serialized input dict
    Input: string | null;
    Output: string | null;
  };
};

export function useReleases(): {
  releases: Release[];
  isPending: boolean;
  error: unknown;
  hasConfig: boolean;
} {
  const { config, hasPermissions } = useDependency(UIPATH_SERVICE_IDS);

  const [releases, isPending, error] = useAsyncState(async () => {
    if (config && hasPermissions) {
      const response = await proxyService<ODataResponseData<Release>>(config, {
        url: "/odata/Releases",
        method: "get",
      });
      return response.data.value;
    }

    return null;
  }, [config, hasPermissions]);

  return { releases, isPending, error, hasConfig: config != null };
}

function useRobots(): { robots: Robot[]; isPending: boolean; error: unknown } {
  const { config, hasPermissions } = useDependency(UIPATH_SERVICE_IDS);
  const [robots, isPending, error] = useAsyncState(async () => {
    if (config && hasPermissions) {
      const response = await proxyService<ODataResponseData<Robot>>(config, {
        url: "/odata/Robots",
        method: "get",
      });
      return response.data.value;
    }

    return [];
  }, [config, hasPermissions]);

  return { robots, isPending, error };
}

const RobotsField: React.FunctionComponent<SchemaFieldProps<number[]>> = ({
  label,
  schema,
  ...props
}) => {
  const { robots, error } = useRobots();

  const options = useMemo(
    () => (robots ?? []).map((x) => ({ value: x.Id, label: x.Id })),
    [robots]
  );

  let description: React.ReactNode =
    "One or more robots on which to run the process";

  if (error) {
    description = (
      <span className="text-danger small">
        Error fetching robots: {getErrorMessage(error)}
      </span>
    );
  }

  return (
    <ConnectedFieldTemplate
      {...props}
      label={label ?? fieldLabel(props.name)}
      description={description}
      as={MultiSelectWidget}
      options={options}
    />
  );
};

export const ReleaseField: React.FunctionComponent<
  SchemaFieldProps<string> & { releases: Release[]; fetchError: unknown }
> = ({ label, schema, releases, fetchError, ...props }) => {
  const options = useMemo(
    () =>
      (releases ?? []).map((x) => ({
        value: x.Key,
        label: `${x.Name} - ${x.ProcessVersion}`,
        release: x,
      })),
    [releases]
  );

  let description: React.ReactNode = "The UIPath process to run";

  if (fetchError) {
    description = (
      <span className="text-danger small">
        Error fetching releases: {getErrorMessage(fetchError)}
      </span>
    );
  }

  return (
    <ConnectedFieldTemplate
      {...props}
      label={label ?? fieldLabel(props.name)}
      description={description}
      as={SelectWidget}
      options={options}
    />
  );
};

function toType(type: string) {
  const { namespace, typeName } = parseAssemblyQualifiedName(type);
  // https://docs.microsoft.com/en-us/dotnet/api/system.valuetype?view=net-5.0
  if (namespace === "System" && typeName === "String") {
    return "string";
  }

  if (namespace === "System" && typeName === "Boolean") {
    return "boolean";
  }

  if (
    namespace === "System" &&
    ["Int64", "Int32", "Int16", "UInt64", "UInt32", "UInt16"].includes(typeName)
  ) {
    return "integer";
  }

  if (namespace === "System" && ["Decimal", "Double"].includes(typeName)) {
    return "number";
  }

  throw new BusinessError(`Unsupported input type: ${type}`);
}

export function releaseSchema(release: Release): Schema {
  if (!release.Arguments.Input) {
    return {};
  }

  const inputs = JSON.parse(release.Arguments.Input) as Argument[];

  const properties = Object.fromEntries(
    inputs.map((input) => [input.name, { type: toType(input.type) }])
  ) as SchemaProperties;

  return {
    properties,
    required: inputs.filter((input) => input.required).map((x) => x.name),
  };
}

const ProcessOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
  showOutputKey,
}) => {
  const basePath = compact([name, configKey]).join(".");

  const { hasPermissions, requestPermissions } = useDependency(
    UIPATH_SERVICE_IDS
  );

  const [{ value: releaseKey }] = useField<string>(`${basePath}.releaseKey`);
  const [{ value: strategy }, , strategyHelpers] = useField<string>(
    `${basePath}.strategy`
  );
  const [{ value: jobsCount }, , jobsCountHelpers] = useField<number>(
    `${basePath}.jobsCount`
  );

  const { releases, error: releasesError } = useReleases();

  useEffect(() => {
    if (!strategy) {
      strategyHelpers.setValue((UIPATH_PROPERTIES.strategy as any).default);
    } else if (strategy === "JobsCount" && jobsCount == null) {
      jobsCountHelpers.setValue(1);
    }
  }, [strategy, jobsCount, jobsCountHelpers, strategyHelpers]);

  const [release, schema] = useMemo(() => {
    const release = releases?.find((x) => x.Key === releaseKey);
    const schema = release ? releaseSchema(release) : null;
    return [release, schema];
  }, [releases, releaseKey]);

  if (!hasPermissions) {
    return (
      <div className="my-2">
        <p>
          You must grant permissions for you browser to send information to
          UiPath.
        </p>
        <Button onClick={requestPermissions}>Grant Permissions</Button>
      </div>
    );
  }

  return (
    <div>
      <ServiceField
        key="uipath"
        name={`${basePath}.uipath`}
        schema={UIPATH_PROPERTIES.uipath as Schema}
      />
      <ReleaseField
        label="release"
        name={`${basePath}.releaseKey`}
        schema={UIPATH_PROPERTIES.releaseKey as Schema}
        releases={releases}
        fetchError={releasesError}
      />
      <FieldRenderer
        name={`${basePath}.strategy`}
        schema={UIPATH_PROPERTIES.strategy as Schema}
      />

      {strategy === "Specific" && (
        <RobotsField
          name={`${basePath}.robotIds`}
          schema={UIPATH_PROPERTIES.robotIds as Schema}
        />
      )}
      {strategy === "JobsCount" && (
        <FieldRenderer
          name={`${basePath}.jobsCount`}
          schema={UIPATH_PROPERTIES.jobsCount as Schema}
        />
      )}
      <FieldRenderer
        name={`${basePath}.awaitResult`}
        schema={UIPATH_PROPERTIES.awaitResult as Schema}
      />
      {releaseKey && release && (
        <ChildObjectField
          heading={release.Name}
          schema={schema}
          name={compact([name, configKey, "inputArguments"]).join(".")}
        />
      )}

      {showOutputKey && (
        <FieldRenderer
          name={`${name}.outputKey`}
          label="Output Variable"
          schema={{
            type: "string",
            description: "A name to refer to this brick in subsequent bricks",
          }}
        />
      )}
    </div>
  );
};

export default ProcessOptions;
