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
import { BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { partial } from "lodash";
import {
  UIPATH_PROPERTIES,
  UIPATH_SERVICE_IDS,
} from "@/contrib/uipath/process";
import { SanitizedServiceConfiguration, Schema } from "@/core";
import { useField } from "formik";
import { proxyService } from "@/background/requests";
import useDependency from "@/services/useDependency";
import ChildObjectField from "@/components/fields/schemaFields/ChildObjectField";
import { Option } from "@/components/form/widgets/SelectWidget";
import { ODataResponseData, Release, Robot } from "./uipathContract";
import { releaseSchema } from "@/contrib/uipath/typeUtils";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { joinName } from "@/utils";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import RemoteSelectWidget from "@/components/form/widgets/RemoteSelectWidget";
import { useAsyncState } from "@/hooks/common";
import RequireServiceConfig from "@/contrib/RequireServiceConfig";
import RemoteMultiSelectWidget from "@/components/form/widgets/RemoteMultiSelectWidget";
import { optionalFactory } from "@/contrib/remoteOptionUtils";

type ReleaseOption = Option & { data: Release };

async function fetchReleases(
  config: SanitizedServiceConfiguration
): Promise<ReleaseOption[]> {
  const response = await proxyService<ODataResponseData<Release>>(config, {
    url: "/odata/Releases",
    method: "get",
  });
  const releases = response.data.value;
  return releases.map((x) => ({
    value: x.Key,
    label: `${x.Name} - ${x.ProcessVersion}`,
    data: x,
  }));
}

const optionalFetchReleases = optionalFactory(fetchReleases);

async function fetchRobots(
  config: SanitizedServiceConfiguration
): Promise<Option[]> {
  const response = await proxyService<ODataResponseData<Robot>>(config, {
    url: "/odata/Robots",
    method: "get",
  });
  const robots = response.data.value;
  return (robots ?? []).map((x) => ({ value: x.Id, label: String(x.Id) }));
}

export function useSelectedRelease(releaseKeyFieldName: string) {
  const [{ value: releaseKey }] = useField<string>(releaseKeyFieldName);

  const { config, hasPermissions } = useDependency(UIPATH_SERVICE_IDS);

  const releasesPromise = useMemo(
    async () => optionalFetchReleases(hasPermissions ? config : null),
    [config, hasPermissions]
  );

  const [selectedRelease] = useAsyncState(async () => {
    const options = await releasesPromise;
    const { data: release } = (options as ReleaseOption[]).find(
      (option) => option.data.Key === releaseKey
    );
    const schema = release ? releaseSchema(release) : null;
    return {
      release,
      schema,
    };
  }, [releasesPromise, releaseKey]);

  return {
    selectedRelease,
    releasesPromise,
  };
}

const ProcessOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
}) => {
  const basePath = joinName(name, configKey);
  const configName = partial(joinName, basePath);

  const [{ value: strategy }, , strategyHelpers] = useField<string>(
    configName("strategy")
  );
  const [{ value: jobsCount }, , jobsCountHelpers] = useField<number>(
    configName("jobsCount")
  );

  const { selectedRelease, releasesPromise } = useSelectedRelease(
    configName("releaseKey")
  );

  useEffect(() => {
    if (strategy === "JobsCount" && jobsCount == null) {
      jobsCountHelpers.setValue(1);
    }
  }, [strategy, jobsCount, jobsCountHelpers, strategyHelpers]);

  return (
    <RequireServiceConfig
      serviceSchema={UIPATH_PROPERTIES.uipath as Schema}
      serviceFieldName={configName("service")}
    >
      {({ config }) => (
        <>
          <ConnectedFieldTemplate
            label="Release"
            name={configName("releaseKey")}
            description="The UiPath release/process"
            as={RemoteSelectWidget}
            blankValue={null}
            optionsFactory={releasesPromise}
          />
          <SchemaField
            name={configName("strategy")}
            schema={UIPATH_PROPERTIES.strategy as Schema}
          />
          {strategy === "Specific" && (
            <ConnectedFieldTemplate
              label="Robots"
              name={configName("releaseKey")}
              description="One or more robots"
              as={RemoteMultiSelectWidget}
              optionsFactory={fetchRobots}
              blankValue={[]}
              config={config}
            />
          )}
          {strategy === "JobsCount" && (
            <SchemaField
              name={configName("jobsCount")}
              schema={UIPATH_PROPERTIES.jobsCount as Schema}
            />
          )}
          <SchemaField
            name={configName("awaitResult")}
            schema={UIPATH_PROPERTIES.awaitResult as Schema}
          />

          <ChildObjectField
            heading={selectedRelease?.release?.Name ?? "Input Arguments"}
            schema={selectedRelease?.schema}
            name={joinName("inputArguments")}
          />
        </>
      )}
    </RequireServiceConfig>
  );
};

export default ProcessOptions;
