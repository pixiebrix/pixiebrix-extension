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
import { DevToolsContext } from "@/devTools/context";
import { useFormikContext } from "formik";
import { isEmpty } from "lodash";
import { checkAvailable } from "@/background/devtools";
import { Button, Form, Nav, Tab } from "react-bootstrap";
import { FormState } from "@/devTools/editor/editorSlice";
import { wizard as menuItemWizard } from "./extensionPoints/menuItem";
import { wizard as triggerWizard } from "./extensionPoints/trigger";
import { wizard as panelWizard } from "./extensionPoints/panel";
import { wizard as actionPanelWizard } from "./extensionPoints/actionPanel";
import { wizard as contextMenuWizard } from "./extensionPoints/contextMenu";
import { useAsyncState } from "@/hooks/common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCommentAlt, faLock } from "@fortawesome/free-solid-svg-icons";
import { IExtension } from "@/core";
import ReloadToolbar from "@/devTools/editor/toolbar/ReloadToolbar";
import ActionToolbar from "@/devTools/editor/toolbar/ActionToolbar";
import { WizardStep } from "@/devTools/editor/extensionPoints/base";

const WIZARD_MAP = {
  menuItem: menuItemWizard,
  trigger: triggerWizard,
  panel: panelWizard,
  contextMenu: contextMenuWizard,
  actionPanel: actionPanelWizard,
};

const LOCKABLE_STEP_NAMES = ["Foundation", "Availability", "Location"];

const WizardNavItem: React.FunctionComponent<{
  step: WizardStep;
  isLocked: boolean;
  lockableStepNames?: string[];
}> = ({ step, isLocked, lockableStepNames = LOCKABLE_STEP_NAMES }) => {
  return (
    <Nav.Item>
      <Nav.Link eventKey={step.step}>
        {step.step}
        {lockableStepNames.includes(step.step) && isLocked && (
          <FontAwesomeIcon className="ml-2" icon={faLock} />
        )}
      </Nav.Link>
    </Nav.Item>
  );
};

const ElementWizard: React.FunctionComponent<{
  installed: IExtension[];
  element: FormState;
  editable: Set<string>;
  toggleChat: (toggle: boolean) => void;
}> = ({ element, editable, installed, toggleChat }) => {
  const { port } = useContext(DevToolsContext);

  const wizard = useMemo(() => WIZARD_MAP[element.type], [element.type]);
  const [step, setStep] = useState(wizard[0].step);

  const isLocked =
    element.installed &&
    editable &&
    !editable.has(element.extensionPoint.metadata.id);

  const [available] = useAsyncState(
    async () =>
      checkAvailable(port, element.extensionPoint.definition.isAvailable),
    [port, element.extensionPoint.definition.isAvailable]
  );

  const {
    errors,
    isSubmitting,
    isValid,
    status,
    handleSubmit,
    handleReset,
  } = useFormikContext<FormState>();

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
          {wizard.map((step) => (
            <WizardNavItem key={step.step} step={step} isLocked={isLocked} />
          ))}

          <div className="flex-grow-1" />

          <div className="mx-3">
            <Button size="sm" variant="info" onClick={() => toggleChat(true)}>
              <FontAwesomeIcon icon={faCommentAlt} /> Live Support
            </Button>
          </div>

          <ReloadToolbar
            element={element}
            disabled={isSubmitting || !isValid}
          />
          <ActionToolbar
            installed={installed}
            element={element}
            disabled={isSubmitting || !isValid}
          />
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
