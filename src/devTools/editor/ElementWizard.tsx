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
import { isEmpty, groupBy } from "lodash";
import { checkAvailable } from "@/background/devtools";
import { Badge, Form, Nav, Tab } from "react-bootstrap";
import { FormState } from "@/devTools/editor/editorSlice";
import { useAsyncState } from "@/hooks/common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import { IExtension } from "@/core";
import ReloadToolbar from "@/devTools/editor/toolbar/ReloadToolbar";
import ActionToolbar from "@/devTools/editor/toolbar/ActionToolbar";
import { WizardStep } from "@/devTools/editor/extensionPoints/base";
import PermissionsToolbar from "@/devTools/editor/toolbar/PermissionsToolbar";
import LogContext from "@/components/logViewer/LogContext";
import { LOGS_EVENT_KEY } from "@/devTools/editor/tabs/LogsTab";
import { ADAPTERS } from "@/devTools/editor/extensionPoints/adapter";
import { useSelector } from "react-redux";
import { RootState } from "@/devTools/store";
import styles from "./ElementWizard.module.scss";
import cx from "classnames";

// Step names to show lock icon for if the user is using a foundation they don't have edit access for
const LOCKABLE_STEP_NAMES = ["Foundation", "Availability", "Location", "Data"];
const LOG_STEP_NAME = "Logs";

const WizardNavItem: React.FunctionComponent<{
  step: WizardStep;
  isLocked: boolean;
  lockableStepNames?: string[];
}> = ({ step, isLocked, lockableStepNames = LOCKABLE_STEP_NAMES }) => {
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
        {lockableStepNames.includes(step.step) && isLocked && (
          <FontAwesomeIcon className="ml-2" icon={faLock} />
        )}
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

  const isBetaUI = useSelector((state: RootState) => state.editor.isBetaUI);

  const wizard = useMemo(
    () =>
      isBetaUI
        ? ADAPTERS.get(element.type).betaWizard
        : ADAPTERS.get(element.type).wizard,
    [element.type, isBetaUI]
  );

  const [step, setStep] = useState(wizard[0].step);

  useEffect(() => {
    setStep(wizard[0].step);
  }, [isBetaUI, wizard, setStep]);

  const isLocked =
    element.installed &&
    editable &&
    !editable.has(element.extensionPoint.metadata.id);

  const { refresh: refreshLogs } = useContext(LogContext);

  const availableDefinition = element.extensionPoint.definition.isAvailable;
  const [available] = useAsyncState(
    async () => checkAvailable(port, availableDefinition),
    [port, availableDefinition]
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
          className={cx({ [styles.nav]: isBetaUI })}
        >
          {wizard.map((step) => (
            <WizardNavItem key={step.step} step={step} isLocked={isLocked} />
          ))}

          {/* spacer */}
          <div className="flex-grow-1" />

          <PermissionsToolbar
            element={element}
            disabled={isSubmitting || !isValid}
          />

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
