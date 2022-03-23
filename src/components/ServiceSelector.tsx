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

import { ServiceDefinition } from "@/types/definitions";
import React, { useMemo } from "react";
import Select from "react-select";
import useFetch from "@/hooks/useFetch";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";

interface ServiceOption {
  value: string;
  label: string;
  service: ServiceDefinition;
}

const ServiceSelector: React.FunctionComponent<{
  onSelect: (service: ServiceDefinition) => void;
  placeholder?: string;
}> = ({ onSelect, placeholder = "Configure a new service" }) => {
  const { data: serviceConfigs } =
    useFetch<ServiceDefinition[]>("/api/services/");
  const serviceOptions = useMemo(
    () =>
      (serviceConfigs ?? [])
        .filter((x) => x.metadata.id !== PIXIEBRIX_SERVICE_ID)
        .map((x) => ({
          value: x.metadata.id,
          label: x.metadata.name,
          service: x,
        })),
    [serviceConfigs]
  );

  return (
    <Select
      options={serviceOptions}
      placeholder={placeholder}
      onChange={(x: ServiceOption) => {
        onSelect(x.service);
      }}
    />
  );
};

export default ServiceSelector;
