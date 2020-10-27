/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
