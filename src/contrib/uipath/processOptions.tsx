/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useEffect, useMemo } from "react";
import {
  BlockOptionProps,
  FieldRenderer,
  ServiceField,
} from "@/components/fields/blockOptions";
import { identity, head, fromPairs } from "lodash";
import { UIPATH_PROPERTIES } from "@/contrib/uipath/process";
import { Schema, SchemaProperties, ServiceDependency } from "@/core";
import { useField, useFormikContext } from "formik";
import { useAsyncState } from "@/hooks/common";
import { proxyService } from "@/background/requests";
import { Card, Form } from "react-bootstrap";
import { fieldLabel } from "@/components/fields/fieldUtils";
import Select from "react-select";
import { FieldProps } from "@/components/fields/propTypes";
import { locator } from "@/background/locator";
import { parseAssemblyQualifiedName } from "csharp-helpers";
import { inputProperties } from "@/helpers";

interface Argument {
  name: string;
  type: string;
  required: boolean;
  hasDefault: boolean;
}

interface ODataResponseData<TValue> {
  "@odata.context": string;
  "@odata.count": number;
  value: TValue[];
}

interface Robot {
  MachineName: string;
  MachineId: number;
  Name: string;
  Username: string;
  Description: string;
  Type: string;
  Id: number;
}

interface Release {
  Key: string;
  ProcessKey: string;
  ProcessVersion: string;
  IsLatestVersion: boolean;
  Description: string;
  Name: string;
  Arguments: {
    // serialized input dict
    Input: string | null;
    Output: string | null;
  };
}

const UIPATH_SERVICE_ID = "uipath/cloud";

function useReleases(): {
  releases: Release[];
  isPending: boolean;
  error: unknown;
} {
  const { values } = useFormikContext<{ services: ServiceDependency[] }>();

  // FIXME: this could use the selected uipath for the block to avoid multiple results
  const config = useMemo(() => {
    const uipath = (values.services ?? []).filter(
      (service) => service.id === UIPATH_SERVICE_ID
    );
    if (uipath.length > 1) {
      throw new Error("Multiple UIPath services configured");
    }
    return head(uipath)?.config;
  }, [values.services]);

  const [releases, isPending, error] = useAsyncState(async () => {
    const localConfig = await locator.locate(UIPATH_SERVICE_ID, config);
    const response = await proxyService<ODataResponseData<Release>>(
      localConfig,
      {
        url: "/odata/Releases",
        method: "get",
      }
    );
    return response.data.value;
  }, [config]);

  return { releases, isPending, error };
}

function useRobots(): { robots: Robot[]; isPending: boolean; error: unknown } {
  const { values } = useFormikContext<{ services: ServiceDependency[] }>();

  // FIXME: this could use the selected uipath for the block to avoid multiple results
  const config = useMemo(() => {
    const uipath = (values.services ?? []).filter(
      (service) => service.id === UIPATH_SERVICE_ID
    );
    if (uipath.length > 1) {
      throw new Error("Multiple UIPath services configured");
    }
    return head(uipath)?.config;
  }, [values.services]);

  const [robots, isPending, error] = useAsyncState(async () => {
    const localConfig = await locator.locate(UIPATH_SERVICE_ID, config);
    const response = await proxyService<ODataResponseData<Robot>>(localConfig, {
      url: "/odata/Robots",
      method: "get",
    });
    return response.data.value;
  }, [config]);

  return { robots, isPending, error };
}

const RobotsField: React.FunctionComponent<FieldProps<number[]>> = ({
  label,
  schema,
  ...props
}) => {
  const [{ value = [], ...field }, meta] = useField<number[]>(props);

  const { robots, error } = useRobots();

  const options = useMemo(() => {
    return (robots ?? []).map((x) => ({ value: x.Id, label: x.Id }));
  }, [robots]);

  return (
    <Form.Group>
      <Form.Label>{label ?? fieldLabel(field.name)}</Form.Label>
      <Select
        isMulti
        options={options}
        value={options.filter((x) => value.includes(x.value))}
        onChange={(option) => {
          console.log(option);
        }}
      />
      {schema.description && (
        <Form.Text className="text-muted">The UIPath process to run</Form.Text>
      )}
      {error && (
        <Form.Control.Feedback type="invalid">
          Error fetching robots: {error.toString()}
        </Form.Control.Feedback>
      )}
      {meta.touched && meta.error && (
        <Form.Control.Feedback type="invalid">
          {meta.error}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
};

export const ReleaseField: React.FunctionComponent<
  FieldProps<string> & { releases: Release[]; error: unknown }
> = ({ label, schema, releases, error, ...props }) => {
  const [{ value, ...field }, meta, helpers] = useField(props);

  const options = useMemo(() => {
    return (releases ?? []).map((x) => ({
      value: x.Key,
      label: `${x.Name} - ${x.ProcessVersion}`,
      release: x,
    }));
  }, [releases]);

  return (
    <Form.Group>
      <Form.Label>{label ?? fieldLabel(field.name)}</Form.Label>
      <Select
        options={options}
        value={options.find((x) => x.value === value)}
        onChange={(option) => helpers.setValue((option as any)?.value)}
      />
      {schema.description && (
        <Form.Text className="text-muted">The UIPath process to run</Form.Text>
      )}
      {error && (
        <Form.Control.Feedback type="invalid">
          Error fetching releases: {error.toString()}
        </Form.Control.Feedback>
      )}
      {meta.touched && meta.error && (
        <Form.Control.Feedback type="invalid">
          {meta.error}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
};

function toType(type: string) {
  const { namespace, typeName } = parseAssemblyQualifiedName(type);

  if (namespace === "System" && typeName === "String") {
    return "string";
  } else if (namespace === "System" && typeName === "Boolean") {
    return "boolean";
  } else {
    throw new Error(`Unsupported input type: ${type}`);
  }
}

function releaseSchema(release: Release): Schema {
  if (!release.Arguments.Input) {
    return {};
  }

  const inputs = JSON.parse(release.Arguments.Input) as Argument[];

  const properties = fromPairs(
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
  const basePath = [name, configKey].filter(identity).join(".");

  const [{ value: releaseKey }] = useField<string>(`${basePath}.releaseKey`);
  const [{ value: strategy }, , strategyHelpers] = useField<string>(
    `${basePath}.strategy`
  );
  const [{ value: jobsCount }, , jobsCountHelpers] = useField<number>(
    `${basePath}.jobsCount`
  );

  const { releases, error } = useReleases();

  useEffect(() => {
    if (!strategy) {
      strategyHelpers.setValue((UIPATH_PROPERTIES["strategy"] as any).default);
    } else if (strategy === "JobsCount" && jobsCount == null) {
      jobsCountHelpers.setValue(1);
    }
  }, [strategy, jobsCount]);

  const [release, schema] = useMemo(() => {
    const release = releases?.find((x) => x.Key === releaseKey);
    const schema = release ? releaseSchema(release) : null;
    return [release, schema];
  }, [releases, releaseKey]);

  console.debug("release", { release, schema });

  return (
    <div>
      <ServiceField
        key="uipath"
        name={`${basePath}.uipath`}
        schema={UIPATH_PROPERTIES["uipath"] as Schema}
      />
      <ReleaseField
        label="release"
        name={`${basePath}.releaseKey`}
        schema={UIPATH_PROPERTIES["releaseKey"] as Schema}
        releases={releases}
        error={error}
      />
      <FieldRenderer
        name={`${basePath}.strategy`}
        schema={UIPATH_PROPERTIES["strategy"] as Schema}
      />

      {strategy === "Specific" && (
        <RobotsField
          name={`${basePath}.robotIds`}
          schema={UIPATH_PROPERTIES["robotIds"] as Schema}
        />
      )}
      {strategy === "JobsCount" && (
        <FieldRenderer
          name={`${basePath}.jobsCount`}
          schema={UIPATH_PROPERTIES["jobsCount"] as Schema}
        />
      )}

      {releaseKey && (
        <Form.Group>
          <Form.Label>inputArguments</Form.Label>
          <Card>
            <Card.Header>{release.Name}</Card.Header>
            <Card.Body>
              {schema &&
                Object.entries(inputProperties(schema)).map(
                  ([prop, fieldSchema]) => {
                    if (typeof fieldSchema === "boolean") {
                      throw new Error(
                        "Expected schema for input property type"
                      );
                    }
                    return (
                      <FieldRenderer
                        key={prop}
                        name={[name, configKey, "inputArguments", prop]
                          .filter(identity)
                          .join(".")}
                        schema={fieldSchema}
                      />
                    );
                  }
                )}
            </Card.Body>
          </Card>
        </Form.Group>
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
