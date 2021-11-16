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

import React, { useMemo, useState } from "react";
import { RecipeDefinition } from "@/types/definitions";
import { Button, Card, Form, Nav, Tab } from "react-bootstrap";
import { isEmpty, mapValues, truncate, uniq } from "lodash";
import "./ActivateWizard.scss";
import { Formik } from "formik";
import ConfigureBody, {
  useSelectedAuths,
  useSelectedExtensions,
} from "./ConfigureBody";
import ServicesBody from "./ServicesBody";
import { WizardValues } from "./wizardTypes";
import ActivateBody from "@/options/pages/marketplace/ActivateBody";
import OptionsBody from "@/options/pages/marketplace/OptionsBody";
import { useTitle } from "@/hooks/title";
import useInstall from "@/pages/marketplace/useInstall";
import AsyncButton from "@/components/AsyncButton";
import { faMagic } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import useEnsurePermissions from "@/options/pages/marketplace/useEnsurePermissions";
import { useLocation } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensions } from "@/options/selectors";
import { uninstallContextMenu } from "@/background/messenger/api";
import { optionsSlice } from "@/options/slices";

const { removeExtension } = optionsSlice.actions;

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
  // OptionsBody takes only a slice of the RecipeDefinition, however the types aren't set up in a way for Typescript
  // to realize it's OK to pass in a whole RecipeDefinition for something that just needs the options prop
  {
    key: "options",
    label: "Personalize",
    Component: OptionsBody as React.FunctionComponent<{
      blueprint: RecipeDefinition;
    }>,
  },
  { key: "services", label: "Select Integrations", Component: ServicesBody },
  { key: "activate", label: "Review & Activate", Component: ActivateBody },
];

const ActivateButton: React.FunctionComponent<{
  blueprint: RecipeDefinition;
}> = ({ blueprint }) => {
  const extensions = useSelectedExtensions(blueprint.extensionPoints);
  const reinstall =
    new URLSearchParams(useLocation().search).get("reinstall") === "1";
  const serviceAuths = useSelectedAuths();
  const { activate, isPending } = useEnsurePermissions(
    blueprint,
    extensions,
    serviceAuths
  );
  const dispatch = useDispatch();
  const localExtensions = useSelector(selectExtensions);
  const installedExtensions = useMemo(
    () =>
      localExtensions?.filter(
        (extension) => extension._recipe?.id === blueprint?.metadata.id
      ),
    [blueprint, localExtensions]
  );

  // TODO: if reinstall, uninstall all extensions,
  //  and then continue with activate
  const uninstallExtensions = async () => {
    for (const extension of installedExtensions) {
      const extensionRef = { extensionId: extension.id };
      // eslint-disable-next-line no-await-in-loop -- see comment above
      await uninstallContextMenu(extensionRef);
      dispatch(removeExtension(extensionRef));
    }
  };

  return (
    <AsyncButton
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (reinstall) {
          uninstallExtensions().then(
            () => {
              activate();
            },
            (error) => {
              console.log(
                `something went wrong when uninstalling extensions: ${error}`
              );
            }
          );
        } else {
          activate();
        }
      }}
    >
      <FontAwesomeIcon icon={faMagic} /> Activate
    </AsyncButton>
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
      extensions: Object.fromEntries(
        extensionPoints.map((x, index) => [index, true])
      ),
      services: serviceIds.map((id) => ({ id, config: undefined })),
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
              onSelect={(step: string) => {
                setStep(step);
              }}
            >
              {blueprintSteps.map((step, index) => (
                <Nav.Item key={step.key} className="flex-grow-1">
                  <Nav.Link eventKey={step.key}>
                    {index + 1}. {step.label}
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
                          onClick={() => {
                            setStep(blueprintSteps[index - 1].key);
                          }}
                        >
                          Previous
                        </Button>

                        {index < blueprintSteps.length - 1 ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setStep(blueprintSteps[index + 1].key);
                            }}
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
