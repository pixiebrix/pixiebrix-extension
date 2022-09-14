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

import React, { useEffect, useState } from "react";
import { RecipeDefinition } from "@/types/definitions";
import { Button, Card, Form, Nav, Tab } from "react-bootstrap";
import { truncate } from "lodash";
import "./ActivateWizard.scss";
import { Formik } from "formik";
import { useTitle } from "@/hooks/title";
import useInstall from "@/options/pages/blueprints/utils/useInstall";
import { useLocation } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import { push } from "connected-react-router";
import useWizard from "@/options/pages/marketplace/useWizard";
import ActivateButton from "@/options/pages/marketplace/ActivateButton";

interface OwnProps {
  blueprint: RecipeDefinition;
}

const ActivateWizard: React.FunctionComponent<OwnProps> = ({ blueprint }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const reinstall =
    new URLSearchParams(location.search).get("reinstall") === "1";
  const [blueprintSteps, initialValues] = useWizard(blueprint);
  const [stepKey, setStep] = useState(blueprintSteps[0].key);
  const install = useInstall(blueprint);

  const installedExtensions = useSelector(selectExtensions);

  // Redirect to reinstall page if the user already has the blueprint installed
  useEffect(() => {
    if (
      !reinstall &&
      installedExtensions.some((x) => x._recipe?.id === blueprint.metadata.id)
    ) {
      dispatch(
        push(
          `/marketplace/activate/${encodeURIComponent(
            blueprint.metadata.id
          )}?reinstall=1`
        )
      );
    }
  }, [dispatch, reinstall, installedExtensions, blueprint.metadata.id]);

  const action = reinstall ? "Reactivate" : "Activate";
  useTitle(`${action} ${truncate(blueprint.metadata.name, { length: 15 })}`);

  return (
    <Formik initialValues={initialValues} onSubmit={install}>
      {({ handleSubmit }) => (
        <Form
          id="activate-wizard"
          noValidate
          onSubmit={handleSubmit}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              (event.nativeEvent.target as HTMLElement).tagName !== "TEXTAREA"
            ) {
              // Don't submit form on "enter" key. Only submit on using "Activate" button
              event.preventDefault();
              return false;
            }
          }}
        >
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
