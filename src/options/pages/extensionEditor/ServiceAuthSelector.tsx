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

import React, { CSSProperties, useMemo } from "react";
import { useField } from "formik";
import Form from "react-bootstrap/Form";
import Select, { StylesConfig } from "react-select";
import { useSelector } from "react-redux";
import { RootState } from "@/options/store";
import { RawServiceConfiguration } from "@/core";
import { useFetch } from "@/hooks/fetch";
import { SanitizedAuth } from "@/types/contract";
import { ServicesState } from "@/options/slices";
import { PIXIEBRIX_SERVICE_ID } from "@/services/registry";

export interface AuthOption {
  value: string;
  label: string;
  serviceId: string;
  local: boolean;
}

function defaultLabel(label: string): string {
  const normalized = (label ?? "").trim();
  return normalized === "" ? "Default" : normalized;
}

const selectConfiguredServices = ({ services }: { services: ServicesState }) =>
  Object.values(services.configured);

export function useAuthOptions(): [AuthOption[]] {
  const configuredServices = useSelector<RootState, RawServiceConfiguration[]>(
    selectConfiguredServices
  );

  const remoteAuths = useFetch<SanitizedAuth[]>("/api/services/shared/?meta=1");

  const authOptions = useMemo(() => {
    const localOptions = (configuredServices ?? []).map((x) => ({
      value: x.id,
      label: `${defaultLabel(x.label)} — Private`,
      local: true,
      serviceId: x.serviceId,
    }));

    const sharedOptions = (remoteAuths ?? []).map((x) => ({
      value: x.id,
      label: `${defaultLabel(x.label)} — ${
        x.organization?.name ?? "✨ Built-in"
      }`,
      local: false,
      serviceId: x.service.config.metadata.id,
    }));

    return [...localOptions, ...sharedOptions];
  }, [remoteAuths, configuredServices]);

  return [authOptions];
}

// customStyles.js
const colors = {
  error: "#dc3545",
  divider: "#ebedf2",
};

export const customStyles: StylesConfig<AuthOption, boolean> = {
  // @ts-ignore: not sure how to pass the genetic argument to the react-select types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: (base: CSSProperties, state: { selectProps: any }) => {
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

const ServiceAuthSelector: React.FunctionComponent<{
  name: string;
  serviceId: string;
  authOptions: AuthOption[];
}> = ({ authOptions, serviceId, ...props }) => {
  const [field, meta, helpers] = useField(props);

  const options = useMemo(
    () => authOptions.filter((x) => x.serviceId === serviceId),
    [authOptions, serviceId]
  );

  const value = useMemo(
    () => authOptions.filter((x) => x.value === field.value),
    [field.value, authOptions]
  );

  if (serviceId === PIXIEBRIX_SERVICE_ID) {
    return (
      <Form.Group controlId={field.name}>
        <Form.Control type="text" readOnly value="Automatic" />
        {meta.error && (
          <Form.Control.Feedback type="invalid" style={{ display: "inline" }}>
            {meta.error}
          </Form.Control.Feedback>
        )}
      </Form.Group>
    );
  }

  return (
    <Form.Group controlId={field.name}>
      <Select
        styles={customStyles}
        name={field.name}
        options={options}
        value={value}
        error={!!meta.error}
        onChange={(x: AuthOption) => {
          console.debug(`Selected option ${x.value} (${x.label})`);
          helpers.setValue(x.value);
        }}
      />
      {meta.error && (
        <Form.Control.Feedback type="invalid" style={{ display: "inline" }}>
          {meta.error}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
};

export default ServiceAuthSelector;
