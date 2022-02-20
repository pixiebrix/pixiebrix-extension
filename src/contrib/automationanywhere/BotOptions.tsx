/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { COMMON_PROPERTIES } from "@/contrib/automationanywhere/RunBot";
import { Schema } from "@/core";
import { useField } from "formik";
import { useAsyncState } from "@/hooks/common";
import useDependency from "@/services/useDependency";
import ChildObjectField from "@/components/fields/schemaFields/ChildObjectField";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import RemoteSelectWidget from "@/components/form/widgets/RemoteSelectWidget";
import { joinName } from "@/utils";
import RequireServiceConfig from "@/contrib/RequireServiceConfig";
import {
  cachedFetchBots,
  cachedFetchDevices,
  cachedFetchRunAsUsers,
  cachedFetchSchema,
} from "@/contrib/automationanywhere/aaApi";
import { AUTOMATION_ANYWHERE_SERVICE_ID } from "./contract";
import { isCommunityControlRoom } from "@/contrib/automationanywhere/aaUtils";
import BooleanWidget from "@/components/fields/schemaFields/widgets/BooleanWidget";
import RemoteMultiSelectWidget from "@/components/form/widgets/RemoteMultiSelectWidget";

const BotOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
}) => {
  const configName = partial(joinName, name, configKey);

  const { hasPermissions, config } = useDependency(
    AUTOMATION_ANYWHERE_SERVICE_ID
  );

  const [{ value: fileId }] = useField<string>(configName("fileId"));

  const [remoteSchema, remoteSchemaPending, remoteSchemaError] =
    useAsyncState(async () => {
      if (hasPermissions && config) {
        // HACK: hack to avoid concurrent requests to the proxy. Simultaneous calls to get the token causes a
        // server error on community edition
        await cachedFetchDevices(config);
        await cachedFetchBots(config);
        await cachedFetchRunAsUsers(config);
        return cachedFetchSchema(config, fileId);
      }

      return null;
    }, [config, fileId, hasPermissions]);

  return (
    <RequireServiceConfig
      serviceSchema={COMMON_PROPERTIES.service as Schema}
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

          {isCommunityControlRoom(config.config.controlRoomUrl) ? (
            <ConnectedFieldTemplate
              label="Device"
              name={configName("deviceId")}
              description="The device to run the bot on"
              as={RemoteSelectWidget}
              optionsFactory={cachedFetchDevices}
              config={config}
            />
          ) : (
            <>
              <ConnectedFieldTemplate
                label="Run as Users"
                name={configName("runAsUserIds")}
                description="The user(s) to run the bots"
                as={RemoteMultiSelectWidget}
                optionsFactory={cachedFetchRunAsUsers}
                config={config}
              />
              <ConnectedFieldTemplate
                label="Await Result"
                name={configName("awaitResult")}
                description="Wait for the bot to run and return the output"
                as={BooleanWidget}
              />
            </>
          )}

          {fileId != null && (
            <ChildObjectField
              heading="Input Arguments"
              name={configName("data")}
              schema={remoteSchema}
              schemaError={remoteSchemaError}
              schemaLoading={remoteSchemaPending}
              isRequired
            />
          )}
        </>
      )}
    </RequireServiceConfig>
  );
};

export default BotOptions;
