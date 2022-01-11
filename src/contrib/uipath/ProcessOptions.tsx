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

import React, { useCallback, useEffect } from "react";
import { BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { partial } from "lodash";
import { UIPATH_PROPERTIES } from "@/contrib/uipath/process";
import { SanitizedServiceConfiguration, Schema } from "@/core";
import { useField } from "formik";
import { proxyService } from "@/background/messenger/api";
import ChildObjectField from "@/components/fields/schemaFields/ChildObjectField";
import { Option } from "@/components/form/widgets/SelectWidget";
import { ODataResponseData, Robot } from "./uipathContract";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { joinName } from "@/utils";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import RemoteSelectWidget from "@/components/form/widgets/RemoteSelectWidget";
import RequireServiceConfig from "@/contrib/RequireServiceConfig";
import RemoteMultiSelectWidget from "@/components/form/widgets/RemoteMultiSelectWidget";
import { useSelectedRelease } from "@/contrib/uipath/uipathHooks";
import cachePromise from "@/utils/cachePromise";

async function fetchRobots(
  config: SanitizedServiceConfiguration
): Promise<Array<Option<number>>> {
  const response = await proxyService<ODataResponseData<Robot>>(config, {
    url: "/odata/Robots",
    method: "get",
  });
  const robots = response.data.value;
  return (robots ?? []).map((x) => ({ value: x.Id, label: String(x.Name) }));
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

  const robotOptionsFactory = useCallback(
    async (config: SanitizedServiceConfiguration) => {
      if (config == null) {
        return [];
      }

      return cachePromise(["uipath:fetchRobots", config], async () =>
        fetchRobots(config)
      );
    },
    []
  );

  return (
    <RequireServiceConfig
      serviceSchema={UIPATH_PROPERTIES.uipath as Schema}
      serviceFieldName={configName("uipath")}
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
            label="Strategy"
            name={configName("strategy")}
            schema={UIPATH_PROPERTIES.strategy as Schema}
            isRequired
          />
          {strategy === "Specific" && (
            <ConnectedFieldTemplate
              label="Robots"
              name={configName("releaseKey")}
              description="One or more robots"
              as={RemoteMultiSelectWidget}
              optionsFactory={robotOptionsFactory}
              blankValue={[]}
              config={config}
            />
          )}
          {strategy === "JobsCount" && (
            <SchemaField
              label="Jobs Count"
              name={configName("jobsCount")}
              schema={UIPATH_PROPERTIES.jobsCount as Schema}
              isRequired
            />
          )}
          <SchemaField
            label="Await Result"
            name={configName("awaitResult")}
            schema={UIPATH_PROPERTIES.awaitResult as Schema}
            isRequired
          />

          <ChildObjectField
            heading={selectedRelease?.release?.Name ?? "Input Arguments"}
            schema={selectedRelease?.schema}
            name={configName("inputArguments")}
          />
        </>
      )}
    </RequireServiceConfig>
  );
};

export default ProcessOptions;
