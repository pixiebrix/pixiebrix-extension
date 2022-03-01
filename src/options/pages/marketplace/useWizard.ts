import { RecipeDefinition } from "@/types/definitions";
import {
  WizardStep,
  WizardValues,
} from "@/options/pages/marketplace/wizardTypes";
import { useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import React, { useMemo } from "react";
import { selectAuths, selectOptions } from "@/pages/marketplace/useReinstall";
import { isEmpty, mapValues, uniq } from "lodash";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import { Schema } from "@/core";
import { isPrimitive } from "@/utils";
import ConfigureBody from "@/options/pages/marketplace/ConfigureBody";
import OptionsBody from "@/options/pages/marketplace/OptionsBody";
import ServicesBody from "@/options/pages/marketplace/ServicesBody";
import ActivateBody from "@/options/pages/marketplace/ActivateBody";

const STEPS: WizardStep[] = [
  { key: "review", label: "Select Bricks", Component: ConfigureBody },
  // OptionsBody takes only a slice of the RecipeDefinition, however the types aren't set up in a way for Typescript
  // to realize it's OK to pass in a whole RecipeDefinition for something that just needs the options prop
  {
    key: "options",
    label: "Personalize Blueprint",
    Component: OptionsBody as React.FunctionComponent<{
      blueprint: RecipeDefinition;
    }>,
  },
  { key: "services", label: "Select Integrations", Component: ServicesBody },
  { key: "activate", label: "Review & Activate", Component: ActivateBody },
];

function useWizard(blueprint: RecipeDefinition): [WizardStep[], WizardValues] {
  const installedExtensions = useSelector(selectExtensions);

  return useMemo(() => {
    const extensionPoints = blueprint.extensionPoints ?? [];

    const installedBlueprintExtensions = installedExtensions?.filter(
      (extension) => extension._recipe?.id === blueprint?.metadata.id
    );

    const installedOptions = selectOptions(installedBlueprintExtensions);
    const installedServices = selectAuths(installedBlueprintExtensions, {
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
          return !isEmpty(blueprint.options?.schema);
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
        blueprint.options?.schema ?? {},
        (optionSchema: Schema, name: string) => {
          // eslint-disable-next-line security/detect-object-injection -- name from the schema
          const value = installedOptions[name] ?? optionSchema.default;
          return isPrimitive(value) ? value : undefined;
        }
      ),
      grantPermissions: false,
    };

    return [steps, initialValues];
  }, [blueprint, installedExtensions]);
}

export default useWizard;
