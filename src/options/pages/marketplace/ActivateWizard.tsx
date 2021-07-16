/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useCallback, useMemo, useState } from "react";
import { RecipeDefinition } from "@/types/definitions";
import { Button, Card, Form, Nav, Tab } from "react-bootstrap";
import { ExtensionOptions, optionsSlice } from "@/options/slices";
import { useToasts } from "react-toast-notifications";
import { groupBy, uniq, pickBy, isEmpty, mapValues, truncate } from "lodash";
import { useDispatch, useSelector } from "react-redux";
import { push } from "connected-react-router";
import "./ActivateWizard.scss";
import { Formik, FormikHelpers } from "formik";
import ConfigureBody, {
  selectedExtensions,
  useSelectedAuths,
  useSelectedExtensions,
} from "./ConfigureBody";
import ServicesBody from "./ServicesBody";
import { WizardValues } from "./wizard";
import { checkPermissions, collectPermissions } from "@/permissions";
import { uninstallContextMenu } from "@/background/contextMenus";
import ActivateBody, {
  useEnsurePermissions,
} from "@/options/pages/marketplace/ActivateBody";
import { reactivate } from "@/background/navigation";
import { useParams } from "react-router";
import OptionsBody from "@/options/pages/marketplace/OptionsBody";
import { selectExtensions } from "@/options/selectors";
import { useTitle } from "@/hooks/title";
import { PIXIEBRIX_SERVICE_ID } from "@/services/registry";

const { installRecipe, removeExtension } = optionsSlice.actions;

type InstallRecipe = (
  values: WizardValues,
  helpers: FormikHelpers<WizardValues>
) => Promise<void>;

function selectAuths(
  extensions: ExtensionOptions[]
): { [serviceId: string]: string } {
  const serviceAuths = groupBy(
    extensions.flatMap((x) => x.services),
    (x) => x.id
  );
  const result: { [serviceId: string]: string } = {};
  for (const [id, auths] of Object.entries(serviceAuths)) {
    const configs = uniq(auths.map(({ config }) => config));
    if (configs.length === 0) {
      throw new Error(`Service ${id} is not configured`);
    } else if (configs.length > 1) {
      throw new Error(`Service ${id} has multiple configurations`);
    }
    // eslint-disable-next-line security/detect-object-injection -- safe because it's from Object.entries
    result[id] = configs[0];
  }
  return result;
}

type Reinstall = (recipe: RecipeDefinition) => Promise<void>;

export function useReinstall(): Reinstall {
  const dispatch = useDispatch();
  const extensions = useSelector(selectExtensions);

  return useCallback(
    async (recipe: RecipeDefinition) => {
      const recipeExtensions = extensions.filter(
        (x) => x._recipeId === recipe.metadata.id
      );

      if (recipeExtensions.length === 0) {
        throw new Error(`No bricks to re-activate for ${recipe.metadata.id}`);
      }

      const currentAuths = selectAuths(recipeExtensions);

      // Uninstall first to avoid duplicates
      for (const extension of recipeExtensions) {
        await uninstallContextMenu({ extensionId: extension.id });
        dispatch(
          removeExtension({
            extensionPointId: extension.extensionPointId,
            extensionId: extension.id,
          })
        );
      }

      dispatch(
        installRecipe({
          recipe,
          extensionPoints: recipe.extensionPoints,
          services: currentAuths,
        })
      );
    },
    [dispatch, extensions]
  );
}

function useInstall(recipe: RecipeDefinition): InstallRecipe {
  const dispatch = useDispatch();
  const { sourcePage } = useParams<{ sourcePage: string }>();
  const { addToast } = useToasts();

  return useCallback(
    async (values, { setSubmitting }: FormikHelpers<WizardValues>) => {
      console.debug("Wizard form values", values);

      const selected = selectedExtensions(values, recipe.extensionPoints);
      const requiredServiceIds = uniq(
        selected
          .flatMap((x) => Object.values(x.services ?? {}))
          .filter((x) => x !== PIXIEBRIX_SERVICE_ID)
      );
      const missingServiceIds = Object.keys(
        pickBy(
          values.services,
          (v, k) => requiredServiceIds.includes(k) && v == null
        )
      );

      const configuredAuths = Object.entries(values.services)
        .filter((x) => x[1])
        .map(([id, config]) => ({ id, config }));

      const enabled = await checkPermissions(
        await collectPermissions(selected, configuredAuths)
      );

      if (selected.length === 0) {
        addToast(`Select at least one brick to activate`, {
          appearance: "error",
          autoDismiss: true,
        });
        setSubmitting(false);
        return;
      }
      if (missingServiceIds.length > 0) {
        addToast(
          `You must select a configuration for each service: ${missingServiceIds.join(
            ", "
          )}`,
          {
            appearance: "error",
            autoDismiss: true,
          }
        );
        setSubmitting(false);
        return;
      }
      if (!enabled) {
        addToast("You must grant browser permissions for the selected bricks", {
          appearance: "error",
          autoDismiss: true,
        });
        setSubmitting(false);
        return;
      }

      try {
        dispatch(
          installRecipe({
            recipe,
            extensionPoints: selected,
            services: values.services,
            optionsArgs: values.optionsArgs,
          })
        );

        addToast(`Installed ${recipe.metadata.name}`, {
          appearance: "success",
          autoDismiss: true,
        });

        setSubmitting(false);

        void reactivate();

        dispatch(
          push(sourcePage === "templates" ? "/templates" : "/installed")
        );
      } catch (error: unknown) {
        console.error(`Error installing ${recipe.metadata.name}`, error);
        addToast(`Error installing ${recipe.metadata.name}`, {
          appearance: "error",
          autoDismiss: true,
        });
        setSubmitting(false);
      }
    },
    [addToast, dispatch, sourcePage, recipe]
  );
}

interface OwnProps {
  blueprint: RecipeDefinition;
}

type Step = {
  key: string;
  label: string;
  Component: React.FunctionComponent<{ blueprint: RecipeDefinition }>;
};

const STEPS: Step[] = [
  { key: "review", label: "Select Bricks", Component: ConfigureBody },
  { key: "options", label: "Personalize", Component: OptionsBody },
  { key: "services", label: "Select Integrations", Component: ServicesBody },
  { key: "activate", label: "Review & Activate", Component: ActivateBody },
];

const ActivateButton: React.FunctionComponent<{
  blueprint: RecipeDefinition;
}> = ({ blueprint }) => {
  const extensions = useSelectedExtensions(blueprint.extensionPoints);
  const serviceAuths = useSelectedAuths();
  const { activate, isPending } = useEnsurePermissions(
    blueprint,
    extensions,
    serviceAuths
  );

  return (
    <Button size="sm" disabled={isPending} onClick={activate}>
      Activate
    </Button>
  );
};

function useWizard(blueprint: RecipeDefinition): [Step[], WizardValues] {
  return useMemo(() => {
    const extensionPoints = blueprint.extensionPoints ?? [];

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
      extensions: Object.fromEntries(extensionPoints.map((x, i) => [i, true])),
      services: Object.fromEntries(serviceIds.map((x) => [x, undefined])),
      optionsArgs: mapValues(
        blueprint.options?.schema ?? {},
        (x) => (x as any).default
      ),
      grantPermissions: false,
    };
    return [steps, initialValues];
  }, [blueprint]);
}

const ActivateWizard: React.FunctionComponent<OwnProps> = ({ blueprint }) => {
  const [blueprintSteps, initialValues] = useWizard(blueprint);

  const [stepKey, setStep] = useState(blueprintSteps[0].key);
  const install = useInstall(blueprint);

  useTitle(`Activate ${truncate(blueprint.metadata.name, { length: 15 })}`);

  return (
    <Formik initialValues={initialValues} onSubmit={install}>
      {({ handleSubmit }) => (
        <Form id="activate-wizard" noValidate onSubmit={handleSubmit}>
          <Tab.Container activeKey={stepKey}>
            <Nav
              variant="pills"
              activeKey={stepKey}
              onSelect={(step: string) => setStep(step)}
            >
              {blueprintSteps.map((x, i) => (
                <Nav.Item key={x.key} className="flex-grow-1">
                  <Nav.Link eventKey={x.key}>
                    {i + 1}. {x.label}
                  </Nav.Link>
                </Nav.Item>
              ))}
            </Nav>
            <Tab.Content className="p-0">
              {blueprintSteps.map(({ Component, label, key }, index) => (
                <Tab.Pane key={key} eventKey={key}>
                  <Card>
                    <Card.Header>{label}</Card.Header>
                    <Component blueprint={blueprint} />
                    <Card.Footer className="d-inline-flex">
                      <div className="ml-auto">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          disabled={index === 0}
                          onClick={() => setStep(blueprintSteps[index - 1].key)}
                        >
                          Previous
                        </Button>

                        {index < blueprintSteps.length - 1 ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              setStep(blueprintSteps[index + 1].key)
                            }
                          >
                            Next Step
                          </Button>
                        ) : (
                          <ActivateButton blueprint={blueprint} />
                        )}
                      </div>
                    </Card.Footer>
                  </Card>
                </Tab.Pane>
              ))}
            </Tab.Content>
          </Tab.Container>
        </Form>
      )}
    </Formik>
  );
};

export default ActivateWizard;
