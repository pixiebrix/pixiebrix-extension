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

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DevToolsContext } from "@/devTools/context";
import { useFormikContext } from "formik";
import { groupBy } from "lodash";
import { checkAvailable } from "@/background/devtools";
import { Badge, Form, Nav, Tab } from "react-bootstrap";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import { useAsyncState } from "@/hooks/common";
import { IExtension } from "@/core";
import ReloadToolbar from "@/devTools/editor/toolbar/ReloadToolbar";
import ActionToolbar from "@/devTools/editor/toolbar/ActionToolbar";
import { WizardStep } from "@/devTools/editor/extensionPoints/base";
import PermissionsToolbar from "@/devTools/editor/toolbar/PermissionsToolbar";
import LogContext from "@/components/logViewer/LogContext";
import { LOGS_EVENT_KEY } from "@/devTools/editor/tabs/LogsTab";
import { ADAPTERS } from "@/devTools/editor/extensionPoints/adapter";
import styles from "./ElementWizard.module.scss";

const LOG_STEP_NAME = "Logs";

const WizardNavItem: React.FunctionComponent<{
  step: WizardStep;
}> = ({ step }) => {
  const { unread } = useContext(LogContext);

  const logBadge = useMemo(() => {
    if (step.step !== LOG_STEP_NAME) {
      return null;
    }

    const levels = groupBy(unread, (x) => x.level);
    for (const [level, variant] of [
      ["error", "danger"],
      ["warning", "warning"],
    ]) {
      // eslint-disable-next-line security/detect-object-injection -- constant levels above
      const numLevel = levels[level];
      if (numLevel) {
        return (
          <Badge className="mx-1" variant={variant}>
            {numLevel.length}
          </Badge>
        );
      }
    }

    return null;
  }, [step.step, unread]);

  return (
    <Nav.Item>
      <Nav.Link eventKey={step.step}>
        {step.step}
        {logBadge}
      </Nav.Link>
    </Nav.Item>
  );
};

const ElementWizard: React.FunctionComponent<{
  installed: IExtension[];
  element: FormState;
  editable: Set<string>;
}> = ({ element, editable, installed }) => {
  const { port } = useContext(DevToolsContext);

  const wizard = useMemo(() => ADAPTERS.get(element.type).wizard, [
    element.type,
  ]);

  const [step, setStep] = useState(wizard[0].step);

  useEffect(() => {
    setStep(wizard[0].step);
  }, [wizard, setStep]);

  const { refresh: refreshLogs } = useContext(LogContext);

  const availableDefinition = element.extensionPoint.definition.isAvailable;
  const [available] = useAsyncState(
    async () => checkAvailable(port, availableDefinition),
    [port, availableDefinition]
  );

  const {
    isSubmitting,
    isValid,
    status,
    handleSubmit,
    handleReset,
  } = useFormikContext<FormState>();

  const selectTabHandler = useCallback(
    (step: string) => {
      setStep(step);
      if (step.toLowerCase() === LOGS_EVENT_KEY.toLowerCase()) {
        // If user is clicking over to the logs tab, they most likely want to see the most recent logs
        void refreshLogs();
      }
    },
    [setStep, refreshLogs]
  );

  return (
    <Tab.Container activeKey={step} key={element.uuid}>
      <Form
        autoComplete="off"
        noValidate
        onSubmit={handleSubmit}
        onReset={handleReset}
        className={styles.form}
      >
        <Nav
          variant="pills"
          activeKey={step}
          onSelect={selectTabHandler}
          className={styles.nav}
        >
          {wizard.map((step) => (
            <WizardNavItem key={step.step} step={step} />
          ))}

          {/* spacer */}
          <div className="flex-grow-1" />

          <PermissionsToolbar
            element={element}
            disabled={isSubmitting || !isValid}
          />

          <ReloadToolbar element={element} disabled={isSubmitting} />

          <ActionToolbar
            installed={installed}
            element={element}
            disabled={isSubmitting}
          />
        </Nav>

        {status && <div className="text-danger">{status}</div>}
        <Tab.Content className={styles.tabContent}>
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
