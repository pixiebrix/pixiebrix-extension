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

import React, { useMemo } from "react";
import { partial } from "lodash";
import { BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import {
  COMMON_PROPERTIES,
  ENTERPRISE_EDITION_PROPERTIES,
} from "@/contrib/automationanywhere/RunBot";
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
  cachedFetchBotFile,
  cachedFetchBots,
  cachedFetchDevicePools,
  cachedFetchDevices,
  cachedFetchRunAsUsers,
  cachedFetchSchema,
} from "@/contrib/automationanywhere/aaApi";
import { AUTOMATION_ANYWHERE_SERVICE_ID, WorkspaceType } from "./contract";
import { isCommunityControlRoom } from "@/contrib/automationanywhere/aaUtils";
import BooleanWidget from "@/components/fields/schemaFields/widgets/BooleanWidget";
import RemoteMultiSelectWidget from "@/components/form/widgets/RemoteMultiSelectWidget";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import { useAsyncEffect } from "use-async-effect";
import SchemaField from "@/components/fields/schemaFields/SchemaField";

const WORKSPACE_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private/Local" },
];

const BotOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
}) => {
  const configName = partial(joinName, name, configKey);

  const { hasPermissions, config } = useDependency(
    AUTOMATION_ANYWHERE_SERVICE_ID
  );

  const [{ value: workspaceType }, , { setValue: setWorkspaceType }] =
    useField<string>(configName("workspaceType"));

  const [{ value: fileId }] = useField<string>(configName("fileId"));

  const [{ value: awaitResult }] = useField<boolean | null>(
    configName("awaitResult")
  );

  // Default the workspaceType based on the file id
  useAsyncEffect(async () => {
    if (config && isCommunityControlRoom(config.config.controlRoomUrl)) {
      // In community edition, each user just works in their own private workspace
      setWorkspaceType("private");
    }

    if (hasPermissions && config && workspaceType == null && fileId) {
      const result = await cachedFetchBotFile(config, fileId);
      const workspaceType =
        result.workspaceType === "PUBLIC" ? "public" : "private";
      setWorkspaceType(workspaceType);
    }
    // Leave setWorkspaceType off the dependency list because Formik changes reference on each render
  }, [config, fileId, hasPermissions, workspaceType]);

  const factoryArgs = useMemo(
    () => ({
      workspaceType: (workspaceType ?? "private") as WorkspaceType,
    }),
    [workspaceType]
  );

  const [remoteSchema, remoteSchemaPending, remoteSchemaError] =
    useAsyncState(async () => {
      if (hasPermissions && config) {
        // HACK: hack to avoid concurrent requests to the proxy. Simultaneous calls to get the token causes a
        // server error on community edition
        await cachedFetchDevices(config, factoryArgs);
        await cachedFetchBots(config, factoryArgs);
        await cachedFetchRunAsUsers(config, factoryArgs);
        return cachedFetchSchema(config, fileId);
      }

      return null;
    }, [config, fileId, factoryArgs, hasPermissions]);

  return (
    <RequireServiceConfig
      serviceSchema={COMMON_PROPERTIES.service as Schema}
      serviceFieldName={configName("service")}
    >
      {({ config }) => (
        <>
          {!isCommunityControlRoom(config.config.controlRoomUrl) && (
            <ConnectedFieldTemplate
              label="Workspace"
              name={configName("workspaceType")}
              description="The Control Room Workspace"
              as={SelectWidget}
              defaultValue="private"
              options={WORKSPACE_OPTIONS}
            />
          )}

          <ConnectedFieldTemplate
            label="Bot"
            name={configName("fileId")}
            description="The Automation Anywhere bot"
            as={RemoteSelectWidget}
            optionsFactory={cachedFetchBots}
            factoryArgs={factoryArgs}
            config={config}
          />

          {isCommunityControlRoom(config.config.controlRoomUrl) ? (
            <ConnectedFieldTemplate
              label="Device"
              name={configName("deviceId")}
              description="The device to run the bot on"
              as={RemoteSelectWidget}
              optionsFactory={cachedFetchDevices}
              factoryArgs={factoryArgs}
              config={config}
            />
          ) : (
            <>
              {workspaceType === "public" && (
                <>
                  <ConnectedFieldTemplate
                    label="Run as Users"
                    name={configName("runAsUserIds")}
                    description="The user(s) to run the bots"
                    as={RemoteMultiSelectWidget}
                    optionsFactory={cachedFetchRunAsUsers}
                    factoryArgs={factoryArgs}
                    config={config}
                  />
                  <ConnectedFieldTemplate
                    label="Device Pools"
                    name={configName("poolIds")}
                    description="A device pool that has at least one active device (optional)"
                    as={RemoteMultiSelectWidget}
                    optionsFactory={cachedFetchDevicePools}
                    factoryArgs={factoryArgs}
                    blankValue={[]}
                    config={config}
                  />
                </>
              )}
              <ConnectedFieldTemplate
                label="Await Result"
                name={configName("awaitResult")}
                description="Wait for the bot to run and return the output"
                as={BooleanWidget}
              />
              {awaitResult && (
                <SchemaField
                  label="Result Timeout (Milliseconds)"
                  name={configName("maxWaitMillis")}
                  schema={ENTERPRISE_EDITION_PROPERTIES.maxWaitMillis as Schema}
                />
              )}
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
