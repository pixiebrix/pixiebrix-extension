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
  OutputKeyField,
} from "@/components/fields/schemaFields/genericOptionsFactory";
import { compact } from "lodash";
import {
  UIPATH_PROPERTIES,
  UIPATH_SERVICE_IDS,
} from "@/contrib/uipath/process";
import { Schema } from "@/core";
import { useField } from "formik";
import { useAsyncState } from "@/hooks/common";
import { proxyService } from "@/background/requests";
import { Button } from "react-bootstrap";
import { fieldLabel } from "@/components/fields/fieldUtils";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import useDependency from "@/services/useDependency";
import { getErrorMessage } from "@/errors";
import ServiceField from "@/components/fields/schemaFields/ServiceField";
import ChildObjectField from "@/components/fields/schemaFields/ChildObjectField";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import MultiSelectWidget from "@/devTools/editor/fields/MultiSelectWidget";
import SelectWidget from "@/devTools/editor/fields/SelectWidget";
import { ODataResponseData, Release, Robot } from "./uipathContract";
import { releaseSchema } from "@/contrib/uipath/typeUtils";
import SchemaField from "@/components/fields/schemaFields/SchemaField";

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
      <SchemaField
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
        <SchemaField
          name={`${basePath}.jobsCount`}
          schema={UIPATH_PROPERTIES.jobsCount as Schema}
        />
      )}
      <SchemaField
        name={`${basePath}.awaitResult`}
        schema={UIPATH_PROPERTIES.awaitResult as Schema}
      />

      <ChildObjectField
        heading={release?.Name ?? "Process"}
        schema={schema}
        name={compact([name, configKey, "inputArguments"]).join(".")}
      />

      {showOutputKey && <OutputKeyField baseName={name} />}
    </div>
  );
};

export default ProcessOptions;
