/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { useFormikContext } from "formik";
import { type WizardValues } from "@/activation/wizardTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";
import { type IntegrationDependency } from "@/types/integrationTypes";
import { type OutputKey } from "@/types/runtimeTypes";
import { type ModComponentDefinition } from "@/types/modDefinitionTypes";
import ModIntegrationsContext from "@/mods/ModIntegrationsContext";

type Props = {
  modComponentDefinitions: ModComponentDefinition[];
  children: React.ReactNode;
};

const WizardValuesModIntegrationsContextAdapter: React.FC<Props> = ({
  modComponentDefinitions,
  children,
}) => {
  const { values: wizardValues } = useFormikContext<WizardValues>();
  const integrationConfigAuths: Record<RegistryId, UUID> = Object.fromEntries(
    wizardValues.services.map(({ id, config }) => [id, config])
  );
  const integrationDependencies: IntegrationDependency[] =
    modComponentDefinitions.flatMap((component) => {
      const integrationOutputKeyMap = component.services;
      return Object.entries(integrationOutputKeyMap).map(
        ([outputKey, id]: [OutputKey, RegistryId]) => ({
          id,
          outputKey,
          // eslint-disable-next-line security/detect-object-injection -- RegistryId
          config: integrationConfigAuths[id],
        })
      );
    });

  return (
    <ModIntegrationsContext.Provider value={{ integrationDependencies }}>
      {children}
    </ModIntegrationsContext.Provider>
  );
};

export default WizardValuesModIntegrationsContextAdapter;
