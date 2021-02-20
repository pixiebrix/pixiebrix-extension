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

import React, { useCallback, useMemo, useState } from "react";
import { RecipeDefinition } from "@/types/definitions";
import { Button, Card, Form, Nav, Tab } from "react-bootstrap";
import { ExtensionOptions, optionsSlice, OptionsState } from "@/options/slices";
import { useToasts } from "react-toast-notifications";
import { groupBy, uniq, pickBy } from "lodash";
import { useDispatch, useSelector } from "react-redux";
import { push } from "connected-react-router";
import "./ActivateWizard.scss";
import { Formik, FormikHelpers } from "formik";
import ConfigureBody, {
  selectedExtensions,
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
import { reportError } from "@/telemetry/logging";
import { useParams } from "react-router";

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
    result[id] = configs[0];
  }
  return result;
}

export function useReinstall(): (recipe: RecipeDefinition) => Promise<void> {
  const dispatch = useDispatch();

  const extensions = useSelector<{ options: OptionsState }, ExtensionOptions[]>(
    ({ options }) => {
      return Object.values(
        options.extensions
      ).flatMap((extensionPointOptions) =>
        Object.values(extensionPointOptions)
      );
    }
  );

  return useCallback(
    async (recipe: RecipeDefinition) => {
      const recipeExtensions = extensions.filter(
        (x) => x._recipeId === recipe.metadata.id
      );

      if (!recipeExtensions.length) {
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
      const requiredServices = uniq(
        selected.flatMap((x) => Object.values(x.services ?? {}))
      );
      const missing = Object.keys(
        pickBy(
          values.services,
          (v, k) => requiredServices.includes(k) && v == null
        )
      );
      const enabled = await checkPermissions(
        await collectPermissions(selected)
      );

      if (!selected.length) {
        addToast(`Select at least one brick to activate`, {
          appearance: "error",
          autoDismiss: true,
        });
        setSubmitting(false);
        return;
      } else if (missing.length) {
        addToast(
          `You must select a configuration for each service: ${missing.join(
            ", "
          )}`,
          {
            appearance: "error",
            autoDismiss: true,
          }
        );
        setSubmitting(false);
        return;
      } else if (!enabled) {
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
          })
        );

        addToast(`Installed ${recipe.metadata.name}`, {
          appearance: "success",
          autoDismiss: true,
        });

        setSubmitting(false);

        reactivate().catch((err) => {
          reportError(err);
        });

        dispatch(
          push(sourcePage === "templates" ? "/templates" : "/installed")
        );
      } catch (ex) {
        console.error(`Error installing ${recipe.metadata.name}`, ex);
        addToast(`Error installing ${recipe.metadata.name}`, {
          appearance: "error",
          autoDismiss: true,
        });
        setSubmitting(false);
      }
    },
    [installRecipe, addToast, dispatch, sourcePage]
  );
}

interface OwnProps {
  blueprint: RecipeDefinition;
}

const STEPS = [
  { key: "review", label: "Configure", Component: ConfigureBody },
  { key: "services", label: "Select Services", Component: ServicesBody },
  { key: "activate", label: "Review & Activate", Component: ActivateBody },
];

const ActivateButton: React.FunctionComponent<{
  blueprint: RecipeDefinition;
}> = ({ blueprint }) => {
  const selected = useSelectedExtensions(blueprint.extensionPoints);
  const { activate, isPending } = useEnsurePermissions(blueprint, selected);

  return (
    <Button size="sm" disabled={isPending} onClick={activate}>
      Activate
    </Button>
  );
};

const ActivateWizard: React.FunctionComponent<OwnProps> = ({ blueprint }) => {
  const [blueprintSteps, initialValues] = useMemo(() => {
    const services = uniq(
      blueprint.extensionPoints.flatMap((x) => Object.values(x.services ?? {}))
    );
    const steps = STEPS.filter((x) => x.key !== "services" || services.length);
    const initialValues = {
      extensions: Object.fromEntries(
        blueprint.extensionPoints.map((x, i) => [i, true])
      ),
      services: Object.fromEntries(services.map((x) => [x, undefined])),
    };
    return [steps, initialValues];
  }, [blueprint]);

  const [stepKey, setStep] = useState(blueprintSteps[0].key);
  const install = useInstall(blueprint);

  return (
    <Formik initialValues={initialValues as WizardValues} onSubmit={install}>
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
                            Next
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
