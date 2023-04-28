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
import { useMemo } from "react";
import {
  inferRecipeAuths,
  inferRecipeOptions,
} from "@/extensionConsole/pages/blueprints/utils/useReinstall";
import { isEmpty, mapValues, uniq } from "lodash";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import { isPrimitive } from "@/utils";
import OptionsBody from "@/extensionConsole/pages/activateRecipe/OptionsBody";
import ServicesBody from "@/extensionConsole/pages/activateRecipe/ServicesBody";
import PermissionsBody from "@/extensionConsole/pages/activateRecipe/PermissionsBody";
import { inputProperties } from "@/helpers";
import * as Yup from "yup";
import useAsyncRecipeOptionsValidationSchema from "@/hooks/useAsyncRecipeOptionsValidationSchema";
import { type RecipeDefinition } from "@/types/recipeTypes";
import { type Schema } from "@/types/schemaTypes";
import { useDefaultAuthOptions } from "@/hooks/auth";
import { RegistryId } from "@/types/registryTypes";
import { UUID } from "@/types/stringTypes";

const STEPS: WizardStep[] = [
  // OptionsBody takes only a slice of the RecipeDefinition, however the types aren't set up in a way for TypeScript
  // to realize it's OK to pass in a whole RecipeDefinition for something that just needs the options prop
  {
    key: "options",
    label: "Configure Mod",
    Component: OptionsBody as React.FunctionComponent<{
      blueprint: RecipeDefinition;
    }>,
  },
  { key: "services", label: "Integrations", Component: ServicesBody },
  { key: "activate", label: "Permissions & URLs", Component: PermissionsBody },
];

function useWizard(
  blueprint: RecipeDefinition,
  defaultAuthOptions?: Record<RegistryId, UUID>
): [WizardStep[], WizardValues, Yup.AnyObjectSchema] {
  const installedExtensions = useSelector(selectExtensions);
  const [optionsValidationSchema] = useAsyncRecipeOptionsValidationSchema(
    blueprint.options?.schema
  );
  console.log("*** defaultAuthOptions", defaultAuthOptions);

  return useMemo(() => {
    const extensionPoints = blueprint.extensionPoints ?? [];

    const installedBlueprintExtensions = installedExtensions?.filter(
      (extension) => extension._recipe?.id === blueprint.metadata.id
    );

    const installedOptions = inferRecipeOptions(installedBlueprintExtensions);
    const installedServices = inferRecipeAuths(installedBlueprintExtensions, {
      optional: true,
    });

    const serviceIds = uniq(
      extensionPoints.flatMap((x) => Object.values(x.services ?? {}))
    );

    const steps = STEPS.filter((step) => {
      switch (step.key) {
        case "services": {
          return serviceIds.some(
            (serviceId) => serviceId !== PIXIEBRIX_SERVICE_ID
          );
        }

        case "options": {
          return !isEmpty(inputProperties(blueprint.options?.schema ?? {}));
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
      services: serviceIds.map((id) => ({
        id,
        // Prefer the installed config for reinstall cases, otherwise use the default
        // eslint-disable-next-line security/detect-object-injection -- is a registry id
        config: installedServices[id] ?? defaultAuthOptions[id]?.value,
      })),
      optionsArgs: mapValues(
        blueprint.options?.schema?.properties ?? {},
        (optionSchema: Schema, name: string) => {
          // eslint-disable-next-line security/detect-object-injection -- name from the schema
          const value = installedOptions[name] ?? optionSchema.default;
          return isPrimitive(value) ? value : undefined;
        }
      ),
    };

    const validationSchema = Yup.object().shape({
      extensions: Yup.object().shape(
        Object.fromEntries(
          extensionPoints.map((_, index) => [index, Yup.boolean().required()])
        )
      ),
      // Services are also validated in useInstall()
      services: Yup.array().of(
        Yup.object().test(
          "servicesRequired",
          "Please select a configuration",
          (value) => value.id === PIXIEBRIX_SERVICE_ID || value.config != null
        )
      ),
      optionsArgs: optionsValidationSchema,
    });

    return [steps, initialValues, validationSchema];
  }, [
    blueprint.extensionPoints,
    blueprint.metadata.id,
    blueprint.options?.schema,
    installedExtensions,
    optionsValidationSchema,
    defaultAuthOptions,
  ]);
}

export default useWizard;
