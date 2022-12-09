import { type RecipeDefinition } from "@/types/definitions";
import {
  type WizardStep,
  type WizardValues,
} from "@/options/pages/marketplace/wizardTypes";
import { useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import type React from "react";
import { useMemo } from "react";
import {
  inferRecipeAuths,
  inferRecipeOptions,
} from "@/options/pages/blueprints/utils/useReinstall";
import { isEmpty, mapValues, uniq } from "lodash";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import { type Schema } from "@/core";
import { isPrimitive } from "@/utils";
import ExtensionsBody from "@/options/pages/marketplace/ExtensionsBody";
import OptionsBody from "@/options/pages/marketplace/OptionsBody";
import ServicesBody from "@/options/pages/marketplace/ServicesBody";
import PermissionsBody from "@/options/pages/marketplace/PermissionsBody";
import { inputProperties } from "@/helpers";
import * as Yup from "yup";
import useRecipeOptionsValidationSchema from "@/hooks/useRecipeOptionsValidationSchema";

const STEPS: WizardStep[] = [
  // OptionsBody takes only a slice of the RecipeDefinition, however the types aren't set up in a way for TypeScript
  // to realize it's OK to pass in a whole RecipeDefinition for something that just needs the options prop
  {
    key: "options",
    label: "Configure Blueprint",
    Component: OptionsBody as React.FunctionComponent<{
      blueprint: RecipeDefinition;
    }>,
  },
  { key: "services", label: "Integrations", Component: ServicesBody },
  { key: "review", label: "Extensions Contained", Component: ExtensionsBody },
  { key: "activate", label: "Permissions & URLs", Component: PermissionsBody },
];

function useWizard(
  blueprint: RecipeDefinition
): [WizardStep[], WizardValues, Yup.ObjectSchema<any>] {
  const installedExtensions = useSelector(selectExtensions);
  const [optionsValidationSchema] = useRecipeOptionsValidationSchema(
    blueprint?.options?.schema
  );

  return useMemo(() => {
    const extensionPoints = blueprint.extensionPoints ?? [];

    const installedBlueprintExtensions = installedExtensions?.filter(
      (extension) => extension._recipe?.id === blueprint?.metadata.id
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
        // eslint-disable-next-line security/detect-object-injection -- is a registry id
        config: installedServices[id],
      })),
      optionsArgs: mapValues(
        blueprint.options?.schema?.properties ?? {},
        (optionSchema: Schema, name: string) => {
          // eslint-disable-next-line security/detect-object-injection -- name from the schema
          const value = installedOptions[name] ?? optionSchema.default;
          return isPrimitive(value) ? value : undefined;
        }
      ),
      grantPermissions: false,
    };

    const validationSchema = Yup.object().shape({
      extensions: Yup.object().shape(
        Object.fromEntries(
          extensionPoints.map((_, index) => [index, Yup.boolean().required()])
        )
      ),
      // Services is validated in useInstall; denoting services as required will prevent
      // form submission without errors until we implement error views on ServicesBody.
      // This is a refactoring opportunity
      services: Yup.array().of(
        Yup.object().shape({
          id: Yup.string(),
          config: Yup.string(),
        })
      ),
      optionsArgs: optionsValidationSchema,
      grantPermissions: Yup.boolean(),
    });

    return [steps, initialValues, validationSchema];
  }, [
    blueprint.extensionPoints,
    blueprint?.metadata.id,
    blueprint.options?.schema,
    installedExtensions,
    optionsValidationSchema,
  ]);
}

export default useWizard;
