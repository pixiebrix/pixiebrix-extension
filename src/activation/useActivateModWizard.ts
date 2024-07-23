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

import { type WizardStep, type WizardValues } from "@/activation/wizardTypes";
import { useSelector } from "react-redux";
import { selectActivatedModComponents } from "@/store/extensionsSelectors";
import type React from "react";
import { isEmpty, mapValues } from "lodash";
import OptionsBody from "@/extensionConsole/pages/activateMod/OptionsBody";
import IntegrationsBody from "@/extensionConsole/pages/activateMod/IntegrationsBody";
import PermissionsBody from "@/extensionConsole/pages/activateMod/PermissionsBody";
import * as Yup from "yup";
import { type AnyObjectSchema } from "yup";
import useAsyncModOptionsValidationSchema from "@/hooks/useAsyncModOptionsValidationSchema";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { type Schema } from "@/types/schemaTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type AuthOption } from "@/auth/authTypes";
import {
  collectConfiguredIntegrationDependencies,
  collectModOptions,
} from "@/store/extensionsUtils";
import { isDatabaseField } from "@/components/fields/schemaFields/fieldTypeCheckers";
import { type Primitive } from "type-fest";
import useDatabaseOptions from "@/hooks/useDatabaseOptions";
import useMergeAsyncState from "@/hooks/useMergeAsyncState";
import { type Option } from "@/components/form/widgets/SelectWidget";
import { type FetchableAsyncState } from "@/types/sliceTypes";
import { type ActivatedModComponent } from "@/types/modComponentTypes";
import { isPrimitive } from "@/utils/typeUtils";
import { inputProperties } from "@/utils/schemaUtils";
import { PIXIEBRIX_INTEGRATION_ID } from "@/integrations/constants";
import getUnconfiguredComponentIntegrations from "@/integrations/util/getUnconfiguredComponentIntegrations";
import { makeDatabasePreviewName } from "@/activation/modOptionsHelpers";

const STEPS: WizardStep[] = [
  { key: "services", label: "Integrations", Component: IntegrationsBody },
  // OptionsBody takes only a slice of the ModDefinition, however the types aren't set up in a way for TypeScript
  // to realize it's OK to pass in a whole ModDefinition for something that just needs the options prop
  {
    key: "options",
    label: "Configure Mod",
    Component: OptionsBody as React.FunctionComponent<{
      mod: ModDefinition;
    }>,
  },
  { key: "activate", label: "Permissions & URLs", Component: PermissionsBody },
];

function forcePrimitive(value: unknown): Primitive | undefined {
  return isPrimitive(value) ? value : undefined;
}

export type UseActivateModWizardResult = {
  wizardSteps: WizardStep[];
  initialValues: WizardValues;
  validationSchema: Yup.AnyObjectSchema;
};

export function wizardStateFactory({
  modDefinition,
  defaultAuthOptions = {},
  databaseOptions,
  activatedModComponents,
  optionsValidationSchema,
  initialModOptions,
}: {
  modDefinition: ModDefinition;
  defaultAuthOptions: Record<RegistryId, AuthOption>;
  databaseOptions: Option[];
  activatedModComponents: ActivatedModComponent[];
  optionsValidationSchema: AnyObjectSchema;
  initialModOptions: UnknownObject;
}): UseActivateModWizardResult {
  const modComponentDefinitions = modDefinition.extensionPoints ?? [];

  const activatedModComponentsForMod = activatedModComponents?.filter(
    (x) => x._recipe?.id === modDefinition.metadata.id,
  );

  const activatedOptions = collectModOptions(activatedModComponentsForMod);
  const activatedIntegrationConfigs = Object.fromEntries(
    collectConfiguredIntegrationDependencies(activatedModComponentsForMod).map(
      ({ integrationId, configId }) => [integrationId, configId],
    ),
  );
  const unconfiguredIntegrationDependencies =
    getUnconfiguredComponentIntegrations(modDefinition);
  const integrationDependencies = unconfiguredIntegrationDependencies.map(
    (unconfiguredDependency) => ({
      ...unconfiguredDependency,
      // Prefer the activated dependency for reactivate cases, otherwise use the default
      configId:
        activatedIntegrationConfigs[unconfiguredDependency.integrationId] ??
        defaultAuthOptions[unconfiguredDependency.integrationId]?.value,
    }),
  );

  const wizardSteps = STEPS.filter((step) => {
    switch (step.key) {
      case "services": {
        return integrationDependencies.some(
          ({ integrationId }) => integrationId !== PIXIEBRIX_INTEGRATION_ID,
        );
      }

      case "options": {
        return !isEmpty(inputProperties(modDefinition.options?.schema ?? {}));
      }

      default: {
        return true;
      }
    }
  });

  const initialValues: WizardValues = {
    modComponents: Object.fromEntries(
      // By default, all mod components in the mod should be toggled on
      modComponentDefinitions.map((_, index) => [index, true]),
    ),
    integrationDependencies,
    optionsArgs: mapValues(
      modDefinition.options?.schema?.properties ?? {},
      (optionSchema: Schema, name: string) => {
        const activatedValue = activatedOptions[name];
        if (activatedValue) {
          return forcePrimitive(activatedValue);
        }

        if (
          isDatabaseField(optionSchema) &&
          optionSchema.format === "preview"
        ) {
          const databaseName = makeDatabasePreviewName(
            modDefinition,
            optionSchema,
            name,
          );
          const existingDatabaseOption = databaseOptions.find(
            (option) => option.label === `${databaseName} - Private`,
          );
          return existingDatabaseOption?.value ?? databaseName;
        }

        if (initialModOptions[name] !== undefined) {
          return forcePrimitive(initialModOptions[name]);
        }

        return forcePrimitive(optionSchema.default);
      },
    ),
  };

  const validationSchema = Yup.object().shape({
    modComponents: Yup.object().shape(
      Object.fromEntries(
        modComponentDefinitions.map((_, index) => [
          index,
          Yup.boolean().required(),
        ]),
      ),
    ),
    integrationDependencies: Yup.array().of(
      Yup.object().test(
        "integrationConfigsRequired",
        "Please select a configuration",
        (value) =>
          value.integrationId === PIXIEBRIX_INTEGRATION_ID ||
          value.configId != null ||
          value.isOptional != null,
      ),
    ),
    optionsArgs: optionsValidationSchema,
  });

  return {
    wizardSteps,
    initialValues,
    validationSchema,
  };
}

function useActivateModWizard(
  modDefinition: ModDefinition,
  defaultAuthOptions: Record<RegistryId, AuthOption> = {},
  initialOptions: UnknownObject = {},
): FetchableAsyncState<UseActivateModWizardResult> {
  const activatedModComponents = useSelector(selectActivatedModComponents);
  const optionsValidationSchemaState = useAsyncModOptionsValidationSchema(
    modDefinition.options?.schema,
  );

  // Force-fetch latest database options
  const databaseOptionsState = useDatabaseOptions({ refetchOnMount: true });

  return useMergeAsyncState(
    optionsValidationSchemaState,
    databaseOptionsState,
    (optionsValidationSchema: AnyObjectSchema, databaseOptions: Option[]) =>
      wizardStateFactory({
        modDefinition,
        defaultAuthOptions,
        databaseOptions,
        activatedModComponents,
        optionsValidationSchema,
        initialModOptions: initialOptions,
      }),
  );
}

export default useActivateModWizard;
