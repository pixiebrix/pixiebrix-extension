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

import React from "react";
import { partial } from "lodash";
import { BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { AUTOMATION_ANYWHERE_PROPERTIES } from "@/contrib/automationanywhere/run";
import { SanitizedServiceConfiguration, Schema } from "@/core";
import { useField } from "formik";
import { useAsyncState } from "@/hooks/common";
import { proxyService } from "@/background/messenger/api";
import useDependency from "@/services/useDependency";
import {
  Bot,
  BOT_TYPE,
  Device,
  Interface,
  interfaceToInputSchema,
  ListResponse,
} from "@/contrib/automationanywhere/contract";
import { validateRegistryId } from "@/types/helpers";
import { Option } from "@/components/form/widgets/SelectWidget";
import ChildObjectField from "@/components/fields/schemaFields/ChildObjectField";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import RemoteSelectWidget from "@/components/form/widgets/RemoteSelectWidget";
import { joinName } from "@/utils";
import RequireServiceConfig from "@/contrib/RequireServiceConfig";
import { cachePromiseMethod } from "@/utils/cachePromise";

const AUTOMATION_ANYWHERE_SERVICE_ID = validateRegistryId(
  "automation-anywhere/control-room"
);

async function fetchBots(
  config: SanitizedServiceConfiguration
): Promise<Option[]> {
  const response = await proxyService<ListResponse<Bot>>(config, {
    url: `/v2/repository/folders/${config.config.folderId}/list`,
    method: "POST",
    data: {},
  });
  const bots = response.data.list?.filter((x) => x.type === BOT_TYPE) ?? [];
  return bots.map((bot) => ({
    value: bot.id,
    label: bot.name,
  }));
}

const cachedFetchBots = cachePromiseMethod(["aa:fetchBots"], fetchBots);

async function fetchDevices(
  config: SanitizedServiceConfiguration
): Promise<Option[]> {
  const response = await proxyService<ListResponse<Device>>(config, {
    url: "/v2/devices/list",
    method: "POST",
    data: {},
  });
  const devices = response.data.list ?? [];
  return devices.map((device) => ({
    value: device.id,
    label: `${device.nickname} (${device.hostName})`,
  }));
}

const cachedFetchDevices = cachePromiseMethod(
  ["aa:fetchDevices"],
  fetchDevices
);

async function fetchSchema(
  config: SanitizedServiceConfiguration,
  fileId: string
) {
  if (config && fileId) {
    const response = await proxyService<Interface>(config, {
      url: `/v1/filecontent/${fileId}/interface`,
      method: "GET",
    });
    return interfaceToInputSchema(response.data);
  }
}

const cachedFetchSchema = cachePromiseMethod(["aa:fetchSchema"], fetchSchema);

const BotOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
}) => {
  const configName = partial(joinName, name, configKey);

  const { hasPermissions, config } = useDependency(
    AUTOMATION_ANYWHERE_SERVICE_ID
  );

  const [{ value: fileId }] = useField<string>(configName("fileId"));

  const [
    remoteSchema,
    remoteSchemaPending,
    remoteSchemaError,
  ] = useAsyncState(
    async () => cachedFetchSchema(hasPermissions ? config : null, fileId),
    [config, fileId, hasPermissions]
  );

  return (
    <RequireServiceConfig
      serviceSchema={AUTOMATION_ANYWHERE_PROPERTIES.service as Schema}
      serviceFieldName={configName("service")}
    >
      {({ config }) => (
        <>
          <ConnectedFieldTemplate
            label="Bot"
            name={configName("fileId")}
            description="The Automation Anywhere bot"
            as={RemoteSelectWidget}
            optionsFactory={cachedFetchBots}
            config={config}
          />

          <ConnectedFieldTemplate
            label="Device"
            name={configName("deviceId")}
            description="The device to run the bot on"
            as={RemoteSelectWidget}
            optionsFactory={cachedFetchDevices}
            config={config}
          />

          {fileId != null && (
            <ChildObjectField
              heading="Input Arguments"
              name={configName("data")}
              schema={remoteSchema}
              schemaError={remoteSchemaError}
              schemaLoading={remoteSchemaPending}
            />
          )}
        </>
      )}
    </RequireServiceConfig>
  );
};

export default BotOptions;
