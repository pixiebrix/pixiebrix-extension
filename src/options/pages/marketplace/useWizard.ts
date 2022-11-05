import { RecipeDefinition } from "@/types/definitions";
import {
  WizardStep,
  WizardValues,
} from "@/options/pages/marketplace/wizardTypes";
import { useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import React, { useMemo } from "react";
import {
  inferRecipeAuths,
  inferRecipeOptions,
} from "@/options/pages/blueprints/utils/useReinstall";
import { isEmpty, mapValues, uniq } from "lodash";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import { Schema } from "@/core";
import { isPrimitive } from "@/utils";
import ExtensionsBody from "@/options/pages/marketplace/ExtensionsBody";
import OptionsBody from "@/options/pages/marketplace/OptionsBody";
import ServicesBody from "@/options/pages/marketplace/ServicesBody";
import PermissionsBody from "@/options/pages/marketplace/PermissionsBody";
import { inputProperties } from "@/helpers";
import * as Yup from "yup";

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

const getValidationSchemaFromOptionSchema = (
  optionSchema: Schema
): Yup.AnySchema => {
  const { type, format, $ref } = optionSchema;

  if (type === "boolean") {
    return Yup.boolean();
  }

  if (type === "number") {
    return Yup.number();
  }

  if (type === "string" && ["date", "date-time"].includes(format)) {
    return Yup.date();
  }

  if (type === "string" && format === "uri") {
    return Yup.string().url();
  }

  if (type === "string") {
    return Yup.string();
  }

  if ($ref === "https://app.pixiebrix.com/schemas/database#") {
    return Yup.string().uuid();
  }

  reportError(
    `Unknown Blueprint option schema in ActivateWizard: ${JSON.stringify(
      optionSchema
    )}`
  );
  return Yup.mixed();
};

function useWizard(
  blueprint: RecipeDefinition
): [WizardStep[], WizardValues, Yup.ObjectSchema<any>] {
  const installedExtensions = useSelector(selectExtensions);

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
      optionsArgs: Yup.object().shape(
        mapValues(
          blueprint.options?.schema?.properties ?? {},
          (optionSchema: Schema, name: string) => {
            const required = blueprint.options.schema.required?.includes(name);
            const baseSchema =
              getValidationSchemaFromOptionSchema(optionSchema);
            return required
              ? baseSchema
                  // This transform prevents nullish type errors being displayed in the form,
                  // instead of "required" errors
                  .transform((value) => (value === null ? undefined : value))
                  .required(`${name} is required`)
              : baseSchema;
          }
        )
      ),
      grantPermissions: Yup.boolean(),
    });

    return [steps, initialValues, validationSchema];
  }, [blueprint, installedExtensions]);
}

export default useWizard;
