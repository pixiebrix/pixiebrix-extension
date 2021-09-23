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
import { BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { compact } from "lodash";
import { AUTOMATION_ANYWHERE_PROPERTIES } from "@/contrib/automationanywhere/run";
import { SanitizedServiceConfiguration, Schema } from "@/core";
import { useField } from "formik";
import { useAsyncState } from "@/hooks/common";
import { proxyService } from "@/background/requests";
import { Button } from "react-bootstrap";
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
import ServiceField from "@/components/fields/schemaFields/ServiceField";
import { Option } from "@/components/form/widgets/SelectWidget";
import ChildObjectField from "@/components/fields/schemaFields/ChildObjectField";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import RemoteSelectWidget from "@/components/form/widgets/RemoteSelectWidget";

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

const BotOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
}) => {
  const basePath = compact([name, configKey]).join(".");
  const { hasPermissions, requestPermissions, config } = useDependency(
    AUTOMATION_ANYWHERE_SERVICE_ID
  );

  const [{ value: fileId }] = useField<string>(`${basePath}.fileId`);

  const [inputSchema, schemaPending, schemaError] = useAsyncState(async () => {
    if (hasPermissions && fileId) {
      const response = await proxyService<Interface>(config, {
        url: `/v1/filecontent/${fileId}/interface`,
        method: "GET",
      });
      return interfaceToInputSchema(response.data);
    }
  }, [config, fileId, hasPermissions]);

  const serviceField = (
    <ServiceField
      label="Integration"
      name={[basePath, "service"].join(".")}
      schema={AUTOMATION_ANYWHERE_PROPERTIES.service as Schema}
    />
  );

  if (!config) {
    return <div>{serviceField}</div>;
  }

  if (!hasPermissions) {
    return (
      <div>
        {serviceField}

        <p>
          You must grant permissions for you browser to send information to the
          Automation Anywhere Control Room API.
        </p>

        <Button onClick={requestPermissions}>Grant Permissions</Button>
      </div>
    );
  }

  return (
    <div>
      {serviceField}

      <ConnectedFieldTemplate
        label="Bot"
        name={`${basePath}.fileId`}
        description="The file id of the bot"
        as={RemoteSelectWidget}
        optionsFactory={fetchBots}
        config={config}
      />

      <ConnectedFieldTemplate
        label="Device"
        name={`${basePath}.deviceId`}
        description="The device to run the bot on"
        as={RemoteSelectWidget}
        optionsFactory={fetchDevices}
        config={config}
      />

      {fileId != null && (
        <ChildObjectField
          heading="Input Arguments"
          name={compact([basePath, "data"]).join(".")}
          schema={inputSchema}
          schemaError={schemaError}
          schemaLoading={schemaPending}
        />
      )}
    </div>
  );
};

export default BotOptions;
