/*
 * Copyright (C) 2021 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useMemo } from "react";
import {
  BlockOptionProps,
  FieldRenderer,
  ServiceField,
} from "@/components/fields/blockOptions";
import { fromPairs, identity, isEmpty } from "lodash";
import { AUTOMATION_ANYWHERE_PROPERTIES } from "@/contrib/automationanywhere/run";
import { Schema } from "@/core";
import { useField } from "formik";
import { useAsyncState } from "@/hooks/common";
import { proxyService } from "@/background/requests";
import { Button, Card, Form } from "react-bootstrap";
import { fieldLabel } from "@/components/fields/fieldUtils";
import Select from "react-select";
import { FieldProps } from "@/components/fields/propTypes";
import { inputProperties } from "@/helpers";
import GridLoader from "react-spinners/GridLoader";
import { useDependency } from "@/services/hooks";
import {
  Bot,
  BOT_TYPE,
  Device,
  Interface,
  ListResponse,
} from "@/contrib/automationanywhere/contract";

const AUTOMATION_ANYWHERE_SERVICE_ID = "automation-anywhere/control-room";

function useBots(): {
  bots: Bot[];
  isPending: boolean;
  error: unknown;
} {
  const { config } = useDependency(AUTOMATION_ANYWHERE_SERVICE_ID);

  const [bots, isPending, error] = useAsyncState(async () => {
    const response = await proxyService<ListResponse<Bot>>(config, {
      url: `/v2/repository/folders/${config.config.folderId}/list`,
      method: "POST",
      data: {},
    });
    return response.data.list.filter((x) => x.type === BOT_TYPE);
  }, [config]);

  return { bots, isPending, error };
}

function useDevices(): {
  devices: Device[];
  isPending: boolean;
  error: unknown;
} {
  const { config } = useDependency(AUTOMATION_ANYWHERE_SERVICE_ID);

  const [devices, isPending, error] = useAsyncState(async () => {
    const response = await proxyService<ListResponse<Device>>(config, {
      url: "/v2/devices/list",
      method: "POST",
      data: {},
    });
    return response.data.list;
  }, [config]);

  return { devices, isPending, error };
}

function interfaceToInputSchema(botInterface: Interface): Schema {
  return {
    type: "object",
    properties: fromPairs(
      botInterface.variables
        .filter((x) => x.input)
        .map((v) => [
          v.name,
          {
            type: "string",
            description: v.description,
          },
        ])
    ),
  };
}

const RobotField: React.FunctionComponent<FieldProps<string>> = ({
  label,
  schema,
  ...props
}) => {
  const [{ value, ...field }, meta, helpers] = useField<string>(props);

  const { bots, error } = useBots();

  const options = useMemo(() => {
    return (bots ?? []).map((bot) => ({ value: bot.id, label: bot.name, bot }));
  }, [bots]);

  return (
    <Form.Group>
      <Form.Label>{label ?? fieldLabel(field.name)}</Form.Label>
      <Select
        options={options}
        value={options.find((x) => value === x.value)}
        onChange={(option) => {
          console.debug("Selected bot option", { option });
          helpers.setValue((option as any).value);
        }}
      />
      {schema.description && (
        <Form.Text className="text-muted">
          The Automation Anywhere bot to run
        </Form.Text>
      )}
      {error && (
        <span className="text-danger small">
          Error fetching robots: {error.toString()}
        </span>
      )}
      {meta.touched && meta.error && (
        <span className="text-danger small">{meta.error}</span>
      )}
    </Form.Group>
  );
};

const DeviceField: React.FunctionComponent<FieldProps<string>> = ({
  label,
  schema,
  ...props
}) => {
  const [{ value, ...field }, meta, helpers] = useField<string>(props);

  const { devices, error } = useDevices();

  const options = useMemo(() => {
    return (devices ?? []).map((device) => ({
      value: device.id,
      label: `${device.nickname} (${device.hostName})`,
      device,
    }));
  }, [devices]);

  return (
    <Form.Group>
      <Form.Label>{label ?? fieldLabel(field.name)}</Form.Label>
      <Select
        options={options}
        value={options.find((x) => value === x.value)}
        onChange={(option) => {
          console.debug("Selected device option", { option });
          helpers.setValue((option as any).value);
        }}
      />
      {schema.description && (
        <Form.Text className="text-muted">
          The device to run the bot on
        </Form.Text>
      )}
      {error && (
        <span className="text-danger small">
          Error fetching devices: {error.toString()}
        </span>
      )}
      {meta.touched && meta.error && (
        <span className="text-danger small">{meta.error}</span>
      )}
    </Form.Group>
  );
};

const BotOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
  showOutputKey,
}) => {
  const basePath = [name, configKey].filter(identity).join(".");
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
    } else {
      return;
    }
  }, [fileId, hasPermissions]);

  if (!config) {
    return (
      <div className="my-2">
        <p>
          You must configure an Automation Anywhere integration to use this
          action.
        </p>
      </div>
    );
  } else if (!hasPermissions) {
    return (
      <div className="my-2">
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
      <ServiceField
        key="service"
        name={`${basePath}.service`}
        schema={AUTOMATION_ANYWHERE_PROPERTIES.service as Schema}
      />
      <RobotField
        label="fileId"
        name={`${basePath}.fileId`}
        schema={AUTOMATION_ANYWHERE_PROPERTIES.fileId as Schema}
      />
      <DeviceField
        label="deviceId"
        name={`${basePath}.deviceId`}
        schema={AUTOMATION_ANYWHERE_PROPERTIES.deviceId as Schema}
      />

      {fileId != null && (
        <Form.Group>
          <Form.Label>inputArguments</Form.Label>
          <Card>
            <Card.Header>inputArguments</Card.Header>
            <Card.Body>
              {inputSchema &&
                Object.entries(inputProperties(inputSchema)).map(
                  ([prop, fieldSchema]) => {
                    if (typeof fieldSchema === "boolean") {
                      throw new TypeError(
                        "Expected schema for input property type"
                      );
                    }
                    return (
                      <FieldRenderer
                        key={prop}
                        name={[name, configKey, "data", prop]
                          .filter(identity)
                          .join(".")}
                        schema={fieldSchema}
                      />
                    );
                  }
                )}
              {inputSchema != null &&
                isEmpty(inputSchema.properties) &&
                !schemaPending && <span>Bot does not take any inputs</span>}
              {schemaPending && <GridLoader />}
              {schemaError && (
                <span className="text-danger">
                  Error fetching schema: {schemaError.toString()}
                </span>
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

export default BotOptions;
