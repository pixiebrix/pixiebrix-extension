import { useSelector } from "react-redux";
import { RootState } from "@/options/store";
import { RawServiceConfiguration } from "@/core";
import { useParams } from "react-router";
import { useMemo } from "react";
import sortBy from "lodash/sortBy";
import registry, { PIXIEBRIX_SERVICE_ID } from "@/services/registry";

function useServiceDefinitions() {
  const configuredServices = useSelector<RootState, RawServiceConfiguration[]>(
    ({ services }) => Object.values(services.configured)
  );
  const { id: configurationId } = useParams<{ id: string }>();

  const serviceDefinitions = useMemo(
    () =>
      sortBy(
        registry.all().filter((x) => x.id !== PIXIEBRIX_SERVICE_ID),
        (x) => x.id
      ),
    []
  );

  const activeConfiguration = useMemo(() => {
    return configurationId
      ? configuredServices.find((x) => x.id === configurationId)
      : null;
  }, [configuredServices, configurationId]);

  const activeService = useMemo(() => {
    return activeConfiguration
      ? serviceDefinitions.find((x) => x.id === activeConfiguration.serviceId)
      : null;
  }, [activeConfiguration, serviceDefinitions]);

  return { serviceDefinitions, activeConfiguration, activeService };
}

export default useServiceDefinitions;
