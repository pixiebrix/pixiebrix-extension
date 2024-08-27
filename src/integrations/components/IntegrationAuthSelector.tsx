/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import React, { type ComponentType, type CSSProperties, useMemo } from "react";
import { useField } from "formik";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Form } from "react-bootstrap";
import Select, {
  type GroupBase,
  type MenuListProps,
  type StylesConfig,
} from "react-select";

import { type AuthOption } from "@/auth/authTypes";
import useAsyncEffect from "use-async-effect";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { type RegistryId } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";
import { useSelector } from "react-redux";
import { selectIntegrationConfigMap } from "@/integrations/store/integrationsSelectors";
import {
  type IntegrationConfigArgs,
  type SanitizedConfig,
} from "@/integrations/integrationTypes";
import { PIXIEBRIX_INTEGRATION_ID } from "@/integrations/constants";

// CustomStyles.js
const colors = {
  error: "#dc3545",
  divider: "#ebedf2",
};

const customStyles: StylesConfig<AuthOption> = {
  // @ts-expect-error not sure how to pass the generic argument to the react-select types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix this typing
  control(base: CSSProperties, state: { selectProps: any }) {
    let statusColor = colors.divider;

    if (state.selectProps.error) {
      // "state.selectProps" references the component props
      statusColor = colors.error;
    }

    return {
      ...base,
      borderColor: statusColor,
    };
  },
};

const IntegrationAuthSelector: React.FunctionComponent<{
  name: string;
  serviceId: RegistryId;
  isOptional?: boolean;
  authOptions: AuthOption[];
  CustomMenuList?: ComponentType<
    MenuListProps<AuthOption, boolean, GroupBase<AuthOption>>
  >;
  sanitizeConfigArgs: (config: IntegrationConfigArgs | null) => SanitizedConfig;
}> = ({
  authOptions,
  serviceId,
  isOptional,
  CustomMenuList,
  sanitizeConfigArgs,
  ...props
}) => {
  const [field, , helpers] = useField<UUID | null>(props);
  const options = useMemo(
    () => authOptions.filter((x) => x.serviceId === serviceId),
    [authOptions, serviceId],
  );

  const integrationConfigs = useSelector(selectIntegrationConfigMap);

  const reportSelectEvent = async (
    option: AuthOption,
    isUserAction: boolean,
  ) => {
    const { value, label, sharingType, local } = option;

    let eventPayload = {
      integration_id: serviceId,
      is_user_action: isUserAction,
      is_create: false,
      auth_label: label,
      auth_sharing_type: sharingType,
      auth_is_local: local,
    };

    if (value) {
      // eslint-disable-next-line security/detect-object-injection -- Not a user-provided value
      const integrationConfig = integrationConfigs[value];
      if (integrationConfig) {
        eventPayload = {
          ...eventPayload,
          ...sanitizeConfigArgs(integrationConfig.config),
        };
      }
    }

    reportEvent(Events.AUTH_WIDGET_SELECT, eventPayload);
  };

  // `react-select` barfs on undefined component overrides
  const components = useMemo(
    () => (CustomMenuList ? { MenuList: CustomMenuList } : {}),
    [CustomMenuList],
  );

  useAsyncEffect(async () => {
    const option = authOptions[0];
    if (
      field.value != null ||
      authOptions.length !== 1 ||
      isOptional ||
      !option
    ) {
      return;
    }

    // Automatically default the field value if there's only one option available
    await helpers.setValue(option.value ?? null);
    void reportSelectEvent(option, false);
  }, [helpers, authOptions, field.value]);

  const value = useMemo(
    () => authOptions.find((x) => x.value === field.value) ?? null,
    [field.value, authOptions],
  );

  if (serviceId === PIXIEBRIX_INTEGRATION_ID) {
    return (
      <Form.Group controlId={field.name}>
        <Form.Control type="text" readOnly value="Automatic" />
      </Form.Group>
    );
  }

  return (
    <Form.Group
      controlId={field.name}
      data-testid={`integration-auth-selector-${field.name}`}
    >
      <Select
        id={`integration-auth-selector-${field.name}-select`}
        styles={customStyles}
        name={field.name}
        options={options}
        value={value}
        isClearable={isOptional}
        placeholder={"Select configuration..."}
        components={components}
        onChange={async (option: AuthOption) => {
          if (option == null) {
            await helpers.setValue(null);
            return;
          }

          console.debug(`Selected option ${option.value} (${option.label})`);
          await helpers.setValue(option.value ?? null);
          void reportSelectEvent(option, true);
        }}
      />
    </Form.Group>
  );
};

export default IntegrationAuthSelector;
