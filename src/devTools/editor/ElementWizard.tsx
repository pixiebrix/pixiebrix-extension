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

import React, { useCallback, useContext, useMemo, useState } from "react";
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
import ToggleField from "@/devTools/editor/components/ToggleField";
import { CONFIG_MAP } from "@/devTools/editor/useCreate";

import { wizard as menuItemWizard } from "./extensionPoints/menuItem";
import { wizard as triggerWizard } from "./extensionPoints/trigger";
import { wizard as panelWizard } from "./extensionPoints/panel";

const wizardMap = {
  menuItem: menuItemWizard,
  trigger: triggerWizard,
  panel: panelWizard,
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

  const run = useCallback(async () => {
    const factory = CONFIG_MAP[debounced.type];
    await nativeOperations.updateDynamicElement(
      port,
      factory(debounced as any)
    );
  }, [debounced, port]);

  const showReloadControls =
    debounced?.type === "trigger" &&
    (debounced as TriggerFormState)?.extensionPoint.definition.trigger ===
      "load";

  useAsyncEffect(async () => {
    const factory = CONFIG_MAP[debounced.type];
    console.debug("Updating element", {
      debounced,
      showReloadControls,
      element: factory(debounced as any),
    });
    if (showReloadControls && !(debounced as TriggerFormState).autoReload) {
      // by default, don't automatically trigger it
      return;
    }
    await nativeOperations.updateDynamicElement(
      port,
      factory(debounced as any)
    );
  }, [debounced, port, showReloadControls]);

  if (!isEmpty(errors)) {
    console.warn("Form errors", { errors });
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

          {showReloadControls && (
            <>
              <label className="AutoRun my-auto mr-1">Auto-Run</label>
              <ToggleField name="autoReload" />
              <Button
                className="mx-2"
                disabled={isSubmitting || !isValid}
                size="sm"
                variant="info"
                onClick={run}
              >
                Run Trigger
              </Button>
            </>
          )}

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
