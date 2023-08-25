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

import { type WizardStep, type WizardValues } from "@/activation/wizardTypes";
import { useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import type React from "react";
import { isEmpty, mapValues } from "lodash";
import { PIXIEBRIX_INTEGRATION_ID } from "@/services/constants";
import OptionsBody from "@/extensionConsole/pages/activateRecipe/OptionsBody";
import ServicesBody from "@/extensionConsole/pages/activateRecipe/ServicesBody";
import PermissionsBody from "@/extensionConsole/pages/activateRecipe/PermissionsBody";
import * as Yup from "yup";
import { type AnyObjectSchema } from "yup";
import useAsyncRecipeOptionsValidationSchema from "@/hooks/useAsyncRecipeOptionsValidationSchema";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { type Schema } from "@/types/schemaTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type AuthOption } from "@/auth/authTypes";
import {
  inferModIntegrations,
  inferRecipeOptions,
} from "@/store/extensionsUtils";
import { isDatabaseField } from "@/components/fields/schemaFields/fieldTypeCheckers";
import { type Primitive } from "type-fest";
import useDatabaseOptions from "@/hooks/useDatabaseOptions";
import useMergeAsyncState from "@/hooks/useMergeAsyncState";
import { type Option } from "@/components/form/widgets/SelectWidget";
import { type FetchableAsyncState } from "@/types/sliceTypes";
import { type UnresolvedModComponent } from "@/types/modComponentTypes";
import { isPrimitive } from "@/utils/typeUtils";
import { inputProperties } from "@/utils/schemaUtils";
import { getUnconfiguredComponentIntegrations } from "@/utils/modDefinitionUtils";

const STEPS: WizardStep[] = [
  { key: "services", label: "Integrations", Component: ServicesBody },
  // OptionsBody takes only a slice of the ModDefinition, however the types aren't set up in a way for TypeScript
  // to realize it's OK to pass in a whole ModDefinition for something that just needs the options prop
  {
    key: "options",
    label: "Configure Mod",
    Component: OptionsBody as React.FunctionComponent<{
      blueprint: ModDefinition;
    }>,
  },
  { key: "activate", label: "Permissions & URLs", Component: PermissionsBody },
];

function forcePrimitive(value: unknown): Primitive | undefined {
  return isPrimitive(value) ? value : undefined;
}

export type UseActivateRecipeWizardResult = {
  wizardSteps: WizardStep[];
  initialValues: WizardValues;
  validationSchema: Yup.AnyObjectSchema;
};

export function makeDatabasePreviewName(
  recipe: ModDefinition,
  optionSchema: Schema,
  name: string
): string {
  return `${recipe.metadata.name} - ${optionSchema.title ?? name}`;
}

export function wizardStateFactory({
  modDefinition,
  defaultAuthOptions = {},
  databaseOptions,
  installedExtensions,
  optionsValidationSchema,
}: {
  modDefinition: ModDefinition;
  defaultAuthOptions: Record<RegistryId, AuthOption>;
  databaseOptions: Option[];
  installedExtensions: UnresolvedModComponent[];
  optionsValidationSchema: AnyObjectSchema;
}): UseActivateRecipeWizardResult {
  const extensionPoints = modDefinition.extensionPoints ?? [];

  const installedBlueprintExtensions = installedExtensions?.filter(
    (extension) => extension._recipe?.id === modDefinition.metadata.id
  );

  const installedOptions = inferRecipeOptions(installedBlueprintExtensions);
  const installedIntegrationConfigs = Object.fromEntries(
    inferModIntegrations(installedBlueprintExtensions, {
      optional: true,
    }).map(({ id, config }) => [id, config])
  );
  const unconfiguredIntegrationDependencies =
    getUnconfiguredComponentIntegrations(modDefinition);
  const integrationDependencies = unconfiguredIntegrationDependencies.map(
    (unconfiguredDependency) => ({
      ...unconfiguredDependency,
      // Prefer the installed dependency for reinstall cases, otherwise use the default
      config:
        installedIntegrationConfigs[unconfiguredDependency.id] ??
        defaultAuthOptions[unconfiguredDependency.id]?.value,
    })
  );

  const wizardSteps = STEPS.filter((step) => {
    switch (step.key) {
      case "services": {
        return integrationDependencies.some(
          ({ id }) => id !== PIXIEBRIX_INTEGRATION_ID
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
    extensions: Object.fromEntries(
      // By default, all extensions in the recipe should be toggled on
      extensionPoints.map((_, index) => [index, true])
    ),
    integrationDependencies,
    optionsArgs: mapValues(
      modDefinition.options?.schema?.properties ?? {},
      (optionSchema: Schema, name: string) => {
        const installed = installedOptions[name];
        if (installed) {
          return forcePrimitive(installed);
        }

        if (
          isDatabaseField(optionSchema) &&
          optionSchema.format === "preview"
        ) {
          const databaseName = makeDatabasePreviewName(
            modDefinition,
            optionSchema,
            name
          );
          const existingDatabaseOption = databaseOptions.find(
            (option) => option.label === `${databaseName} - Private`
          );
          return existingDatabaseOption?.value ?? databaseName;
        }

        return forcePrimitive(optionSchema.default);
      }
    ),
  };

  const validationSchema = Yup.object().shape({
    extensions: Yup.object().shape(
      Object.fromEntries(
        extensionPoints.map((_, index) => [index, Yup.boolean().required()])
      )
    ),
    integrationDependencies: Yup.array().of(
      Yup.object().test(
        "integrationsRequired",
        "Please select a configuration",
        (value) => value.id === PIXIEBRIX_INTEGRATION_ID || value.config != null
      )
    ),
    optionsArgs: optionsValidationSchema,
  });

  return {
    wizardSteps,
    initialValues,
    validationSchema,
  };
}

function useActivateRecipeWizard(
  recipe: ModDefinition,
  defaultAuthOptions: Record<RegistryId, AuthOption> = {}
): FetchableAsyncState<UseActivateRecipeWizardResult> {
  const installedExtensions = useSelector(selectExtensions);
  const optionsValidationSchemaState = useAsyncRecipeOptionsValidationSchema(
    recipe.options?.schema
  );

  // Force-fetch latest database options
  const databaseOptionsState = useDatabaseOptions({ refetchOnMount: true });

  return useMergeAsyncState(
    optionsValidationSchemaState,
    databaseOptionsState,
    (optionsValidationSchema: AnyObjectSchema, databaseOptions: Option[]) =>
      wizardStateFactory({
        modDefinition: recipe,
        defaultAuthOptions,
        databaseOptions,
        installedExtensions,
        optionsValidationSchema,
      })
  );
}

export default useActivateRecipeWizard;
