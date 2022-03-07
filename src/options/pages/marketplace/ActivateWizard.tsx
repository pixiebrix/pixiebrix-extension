/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { truncate } from "lodash";
import "./ActivateWizard.scss";
import { Formik } from "formik";
import { useSelectedAuths, useSelectedExtensions } from "./ConfigureBody";
import { useTitle } from "@/hooks/title";
import useInstall from "@/pages/marketplace/useInstall";
import AsyncButton from "@/components/AsyncButton";
import { faMagic } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useEnsurePermissions from "@/options/pages/marketplace/useEnsurePermissions";
import { useLocation } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import { uninstallContextMenu } from "@/background/messenger/api";
import notify from "@/utils/notify";
import useWizard from "@/options/pages/marketplace/useWizard";
import extensionsSlice from "@/store/extensionsSlice";

const { removeExtension } = extensionsSlice.actions;

interface OwnProps {
  blueprint: RecipeDefinition;
}

const ActivateButton: React.FunctionComponent<{
  blueprint: RecipeDefinition;
}> = ({ blueprint }) => {
  const extensions = useSelectedExtensions(blueprint.extensionPoints);
  const location = useLocation();
  const reinstall =
    new URLSearchParams(location.search).get("reinstall") === "1";
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

  const uninstallExtensions = async () => {
    for (const extension of installedExtensions) {
      const extensionRef = { extensionId: extension.id };
      // eslint-disable-next-line no-await-in-loop -- see useReinstall.ts
      await uninstallContextMenu(extensionRef);
      dispatch(removeExtension(extensionRef));
    }
  };

  const activateOrReinstall = async () => {
    if (!reinstall) {
      activate();
      return;
    }

    try {
      await uninstallExtensions();
      activate();
    } catch (error) {
      notify.error({
        message: "Error re-installing bricks",
        error,
      });
    }
  };

  return (
    <AsyncButton size="sm" disabled={isPending} onClick={activateOrReinstall}>
      <FontAwesomeIcon icon={faMagic} /> Activate
    </AsyncButton>
  );
};

const ActivateWizard: React.FunctionComponent<OwnProps> = ({ blueprint }) => {
  const location = useLocation();
  const reinstall =
    new URLSearchParams(location.search).get("reinstall") === "1";
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
                    <Component blueprint={blueprint} reinstall={reinstall} />
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
