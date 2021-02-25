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
import {
  checkAvailable,
  uninstallContextMenu,
} from "@/background/devtools/index";
import { Button, ButtonGroup, Form, Nav, Tab } from "react-bootstrap";
import {
  actions,
  FormState,
  TriggerFormState,
} from "@/devTools/editor/editorSlice";
import { optionsSlice } from "@/options/slices";
import ToggleField from "@/devTools/editor/components/ToggleField";
import { wizard as menuItemWizard } from "./extensionPoints/menuItem";
import { wizard as triggerWizard } from "./extensionPoints/trigger";
import { wizard as panelWizard } from "./extensionPoints/panel";
import { wizard as contextMenuWizard } from "./extensionPoints/contextMenu";
import { useDispatch } from "react-redux";
import { useAsyncState } from "@/hooks/common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHistory,
  faLock,
  faSave,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { IExtension } from "@/core";
import {
  ADAPTERS,
  extensionToFormState,
} from "@/devTools/editor/extensionPoints/adapter";
import { reportError } from "@/telemetry/logging";
import { useToasts } from "react-toast-notifications";

const wizardMap = {
  menuItem: menuItemWizard,
  trigger: triggerWizard,
  panel: panelWizard,
  contextMenu: contextMenuWizard,
};

const ElementWizard: React.FunctionComponent<{
  installed: IExtension[];
  element: FormState;
  refreshMillis?: number;
  editable: Set<string>;
}> = ({ element, refreshMillis = 250, editable, installed }) => {
  const dispatch = useDispatch();
  const { port } = useContext(DevToolsContext);
  const { addToast } = useToasts();
  const wizard = useMemo(() => wizardMap[element.type], [element.type]);

  const [step, setStep] = useState(wizard[0].step);

  const [available] = useAsyncState(
    async () =>
      await checkAvailable(port, element.extensionPoint.definition.isAvailable),
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

  const run = useCallback(async () => {
    const { definition: factory } = ADAPTERS.get(debounced.type);
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
    if (showReloadControls && !(debounced as TriggerFormState).autoReload) {
      // by default, don't automatically trigger it
      return;
    }
    const { definition: factory } = ADAPTERS.get(debounced.type);
    console.debug("Updating dynamic element", {
      debounced,
      showReloadControls,
      element: factory(debounced as any),
    });
    await nativeOperations.updateDynamicElement(
      port,
      factory(debounced as any)
    );
  }, [debounced, port, showReloadControls]);

  const reset = useCallback(async () => {
    try {
      const extension = installed.find((x) => x.id === element.uuid);
      const state = await extensionToFormState(extension);
      dispatch(actions.resetInstalled(state));
    } catch (error) {
      reportError(error);
      dispatch(actions.adapterError({ uuid: element.uuid, error }));
    }
  }, [dispatch, element.uuid, installed]);

  const remove = useCallback(async () => {
    console.debug(`pageEditor: remove element ${element.uuid}`);
    try {
      if (element.type === "contextMenu") {
        try {
          await uninstallContextMenu(port, { extensionId: element.uuid });
        } catch (err) {
          // The context menu may not currently be registered if it's not on a page that has a contentScript
          // with a pattern that matches
          console.info("Cannot unregister contextMenu", { err });
        }
      }
      try {
        await nativeOperations.clearDynamicElements(port, {
          uuid: element.uuid,
        });
      } catch (err) {
        // element might not be on the page anymore
        console.info("Cannot clear dynamic element from page", { err });
      }
      if (values.installed) {
        dispatch(
          optionsSlice.actions.removeExtension({
            extensionPointId: values.extensionPoint.metadata.id,
            extensionId: values.uuid,
          })
        );
      }
      dispatch(actions.removeElement(element.uuid));
    } catch (err) {
      reportError(err);
      addToast(
        `Error removing element: ${err.message?.toString() ?? "Unknown Error"}`,
        {
          appearance: "error",
          autoDismiss: true,
        }
      );
    }
  }, [values, addToast, port, element, dispatch]);

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
