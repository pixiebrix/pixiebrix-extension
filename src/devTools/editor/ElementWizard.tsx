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
import { DevToolsContext } from "@/devTools/context";
import { useFormikContext } from "formik";
import { isEmpty } from "lodash";
import { useDebounce } from "use-debounce";
import useAsyncEffect from "use-async-effect";
import * as nativeOperations from "@/background/devtools/index";
import { checkAvailable } from "@/background/devtools";
import { Button, ButtonGroup, Form, Nav, Tab } from "react-bootstrap";
import { FormState, TriggerFormState } from "@/devTools/editor/editorSlice";
import ToggleField from "@/devTools/editor/components/ToggleField";
import { wizard as menuItemWizard } from "./extensionPoints/menuItem";
import { wizard as triggerWizard } from "./extensionPoints/trigger";
import { wizard as panelWizard } from "./extensionPoints/panel";
import { wizard as actionPanelWizard } from "./extensionPoints/actionPanel";
import { wizard as contextMenuWizard } from "./extensionPoints/contextMenu";
import { useAsyncState } from "@/hooks/common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCommentAlt,
  faHistory,
  faLock,
  faSave,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { IExtension } from "@/core";
import { ADAPTERS } from "@/devTools/editor/extensionPoints/adapter";
import { useRemove, useReset } from "@/devTools/editor/editorHooks";

const wizardMap = {
  menuItem: menuItemWizard,
  trigger: triggerWizard,
  panel: panelWizard,
  contextMenu: contextMenuWizard,
  actionPanel: actionPanelWizard,
};

const ElementWizard: React.FunctionComponent<{
  installed: IExtension[];
  element: FormState;
  refreshMillis?: number;
  editable: Set<string>;
  toggleChat: (toggle: boolean) => void;
}> = ({ element, refreshMillis = 250, editable, installed, toggleChat }) => {
  const { port } = useContext(DevToolsContext);
  const wizard = useMemo(() => wizardMap[element.type], [element.type]);

  const [step, setStep] = useState(wizard[0].step);

  const [available] = useAsyncState(
    async () =>
      checkAvailable(port, element.extensionPoint.definition.isAvailable),
    [port, element.extensionPoint.definition.isAvailable]
  );

  const {
    values,
    errors,
    isSubmitting,
    isValid,
    status,
    handleSubmit,
    handleReset,
  } = useFormikContext<FormState>();

  const [debounced] = useDebounce(element, refreshMillis, {
    leading: false,
    trailing: true,
  });

  const remove = useRemove(element);
  const reset = useReset(installed, element);

  const run = useCallback(async () => {
    const { definition: factory } = ADAPTERS.get(debounced.type);
    await nativeOperations.updateDynamicElement(port, factory(debounced));
  }, [debounced, port]);

  const isLoadTrigger =
    debounced?.type === "trigger" &&
    (debounced as TriggerFormState)?.extensionPoint.definition.trigger ===
      "load";

  const isPanel = ["panel", "actionPanel"].includes(debounced?.type);

  const showReloadControls = isLoadTrigger || isPanel;

  useAsyncEffect(async () => {
    if (showReloadControls && !(debounced as TriggerFormState).autoReload) {
      // by default, don't automatically trigger it
      return;
    }
    const { definition: factory } = ADAPTERS.get(debounced.type);
    console.debug("Updating dynamic element", {
      debounced,
      showReloadControls,
      element: factory(debounced),
    });
    await nativeOperations.updateDynamicElement(port, factory(debounced));
  }, [debounced, port, showReloadControls]);

  if (!isEmpty(errors)) {
    console.warn("Form errors", { errors });
  }

  return (
    <Tab.Container activeKey={step} key={element.uuid}>
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
              <Nav.Link eventKey={x.step}>
                {x.step}
                {x.step === "Foundation" &&
                  element.installed &&
                  editable &&
                  !editable.has(element.extensionPoint.metadata.id) && (
                    <FontAwesomeIcon className="ml-2" icon={faLock} />
                  )}
                {x.step === "Availability" &&
                  element.installed &&
                  editable &&
                  !editable.has(element.extensionPoint.metadata.id) && (
                    <FontAwesomeIcon className="ml-2" icon={faLock} />
                  )}
              </Nav.Link>
            </Nav.Item>
          ))}

          <div className="flex-grow-1" />

          <div className="mx-3">
            <Button size="sm" variant="info" onClick={() => toggleChat(true)}>
              <FontAwesomeIcon icon={faCommentAlt} /> Live Support
            </Button>
          </div>

          {showReloadControls && (
            <>
              <label className="AutoRun my-auto mr-1">
                {isPanel ? "Auto-Render" : "Auto-Run"}
              </label>
              <ToggleField name="autoReload" />
              <Button
                className="mx-2"
                disabled={isSubmitting || !isValid}
                size="sm"
                variant="info"
                onClick={run}
              >
                {isPanel ? "Render Panel" : "Run Trigger"}
              </Button>
            </>
          )}
          <ButtonGroup className="ml-2">
            <Button
              disabled={isSubmitting || !isValid}
              type="submit"
              size="sm"
              variant="primary"
            >
              <FontAwesomeIcon icon={faSave} /> Save
            </Button>
            {values.installed && (
              <Button
                disabled={isSubmitting || !isValid}
                size="sm"
                variant="warning"
                onClick={reset}
              >
                <FontAwesomeIcon icon={faHistory} /> Reset
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={remove}>
              <FontAwesomeIcon icon={faTrash} /> Remove
            </Button>
          </ButtonGroup>
        </Nav>
        {status && <div className="text-danger">{status}</div>}
        <Tab.Content className="h-100">
          {wizard.map(({ Component, step, extraProps = {} }) => (
            <Component
              key={step}
              eventKey={step}
              editable={editable}
              available={available}
              {...extraProps}
            />
          ))}
        </Tab.Content>
      </Form>
    </Tab.Container>
  );
};

export default ElementWizard;
