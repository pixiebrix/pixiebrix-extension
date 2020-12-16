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

import React, { useContext, useMemo, useState } from "react";
import { PayloadAction } from "@reduxjs/toolkit";
import { DevToolsContext } from "@/devTools/context";
import { useFormikContext } from "formik";
import { isEmpty } from "lodash";
import { useDebounce } from "use-debounce";
import useAsyncEffect from "use-async-effect";
import * as nativeOperations from "@/background/devtools";
import { Button, Form, Nav, Tab } from "react-bootstrap";
import {
  actions,
  FormState,
  TriggerFormState,
} from "@/devTools/editor/editorSlice";
import { CONFIG_MAP } from "@/devTools/editor/useCreate";

import { wizard as menuItemWizard } from "./extensionPoints/menuItem";
import { wizard as triggerWizard } from "./extensionPoints/trigger";

const wizardMap = {
  menuItem: menuItemWizard,
  trigger: triggerWizard,
};

const ElementWizard: React.FunctionComponent<{
  element: FormState;
  dispatch: (action: PayloadAction<unknown>) => void;
  refreshMillis?: number;
}> = ({ element, dispatch, refreshMillis = 150 }) => {
  const { port } = useContext(DevToolsContext);

  const wizard = useMemo(() => wizardMap[element.type], [element.type]);

  const [step, setStep] = useState(wizard[0].step);

  const TabPane = useMemo(
    () => wizard.find((x) => x.step === step)?.Component,
    [wizard, step]
  );

  const {
    errors,
    isSubmitting,
    isValid,
    status,
    handleSubmit,
    handleReset,
  } = useFormikContext();

  const [debounced] = useDebounce(element, refreshMillis);

  useAsyncEffect(async () => {
    const factory = CONFIG_MAP[element.type];
    if (
      element.type === "trigger" &&
      (element as TriggerFormState).extensionPoint.definition.trigger == "load"
    ) {
      // by default, don't automatically trigger it
      return;
    }
    await nativeOperations.updateDynamicElement(port, factory(element as any));
  }, [debounced]);

  if (!isEmpty(errors)) {
    console.debug("Form errors", { errors });
  }

  return (
    <Tab.Container activeKey={step}>
      <Form
        autoComplete="off"
        noValidate
        onSubmit={handleSubmit}
        onReset={handleReset}
        className="h-100"
      >
        <Nav
          variant="pills"
          activeKey={step}
          onSelect={(step: string) => setStep(step)}
        >
          {wizard.map((x) => (
            <Nav.Item key={x.step}>
              <Nav.Link eventKey={x.step}>{x.step}</Nav.Link>
            </Nav.Item>
          ))}

          <div className="flex-grow-1" />
          <Button
            className="mx-2"
            disabled={isSubmitting || !isValid}
            type="submit"
            size="sm"
            variant="primary"
          >
            Save Action
          </Button>

          <Button
            variant="danger"
            className="mr-2"
            size="sm"
            onClick={async () => {
              try {
                await nativeOperations.clear(port, {
                  uuid: element.uuid,
                });
              } catch (reason) {
                // element might not be on the page anymore
              }
              dispatch(actions.removeElement(element.uuid));
            }}
          >
            Remove
          </Button>
        </Nav>
        {status && <div className="text-danger">{status}</div>}

        {TabPane && (
          <TabPane eventKey={step} element={element} dispatch={dispatch} />
        )}
      </Form>
    </Tab.Container>
  );
};

export default ElementWizard;
