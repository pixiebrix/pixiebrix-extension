import { ServiceDefinition } from "@/types/definitions";
import React, { useMemo } from "react";
import { useFetch } from "@/hooks/fetch";
import Select from "react-select";
import { PIXIEBRIX_SERVICE_ID } from "@/services/registry";

interface ServiceOption {
  value: string;
  label: string;
  service: ServiceDefinition;
}

const ServiceSelector: React.FunctionComponent<{
  onSelect: (service: ServiceDefinition) => void;
  placeholder?: string;
}> = ({ onSelect, placeholder = "Configure a new service" }) => {
  const serviceConfigs = useFetch("/api/services/") as ServiceDefinition[];
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
      onChange={(x: ServiceOption) => onSelect(x.service)}
    />
  );
};

export default ServiceSelector;
