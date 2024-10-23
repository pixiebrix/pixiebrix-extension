/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import styles from "./ModComponentFormStateWizard.module.scss";

import React, { useState } from "react";
import { useFormikContext } from "formik";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Form as BootstrapForm, Nav, Tab } from "react-bootstrap";
import ReloadToolbar from "@/pageEditor/toolbar/ReloadToolbar";
import { type WizardStep } from "@/pageEditor/starterBricks/base";
import PermissionsToolbar from "@/pageEditor/toolbar/PermissionsToolbar";
import LogsTab, { LOGS_EVENT_KEY } from "@/pageEditor/tabs/logs/LogsTab";
import EditTab from "@/pageEditor/tabs/editTab/EditTab";
import { useDispatch } from "react-redux";
import cx from "classnames";
import LogNavItemBadge from "../tabs/logs/NavItemBadge";
import { logActions } from "@/components/logViewer/logSlice";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import AnalysisAnnotationsContext from "@/analysis/AnalysisAnnotationsContext";

import { selectActiveModComponentAnalysisAnnotationsForPath } from "@/pageEditor/store/editor/editorSelectors";

const EDIT_STEP_NAME = "Edit";
const LOG_STEP_NAME = "Logs";

const wizard = [
  { step: EDIT_STEP_NAME, Component: EditTab },
  { step: LOG_STEP_NAME, Component: LogsTab },
] as const satisfies WizardStep[];

type WizardStepName = (typeof wizard)[number]["step"];

const WizardNavItem: React.FunctionComponent<{
  step: WizardStep;
}> = ({ step }) => (
  <Nav.Item className="d-flex align-items-stretch">
    <Nav.Link className="d-flex align-items-center" eventKey={step.step}>
      {step.step}
      {step.step === LOG_STEP_NAME && <LogNavItemBadge />}
    </Nav.Link>
  </Nav.Item>
);

/**
 * @deprecated This will soon be split into a new business-logic component, decoupled with the layout, using EditTabLayout
 * @see EditorTabLayout
 * @see EditorPane
 */
const ModComponentFormStateWizard: React.FunctionComponent<{
  modComponentFormState: ModComponentFormState;
}> = ({ modComponentFormState }) => {
  const [step, setStep] = useState<WizardStepName>(wizard[0].step);

  const { isValid, status, handleReset } =
    useFormikContext<ModComponentFormState>();

  const dispatch = useDispatch();

  const refreshEntries = () => {
    dispatch(logActions.refreshEntries());
  };

  const selectTabHandler = (step: WizardStepName) => {
    setStep(step);
    if (step.toLowerCase() === LOGS_EVENT_KEY.toLowerCase()) {
      // If user is clicking over to the logs tab, they most likely want to see the most recent logs
      refreshEntries();
    }
  };

  const wizardSteps = [...wizard];

  return (
    <Tab.Container activeKey={step} key={modComponentFormState.uuid}>
      <AnalysisAnnotationsContext.Provider
        value={{
          analysisAnnotationsSelectorForPath:
            selectActiveModComponentAnalysisAnnotationsForPath,
        }}
      >
        <BootstrapForm
          autoComplete="off"
          noValidate
          onReset={handleReset}
          className={cx(styles.form, "full-height")}
          data-testid="editorPane"
        >
          <Nav
            variant="pills"
            activeKey={step}
            onSelect={selectTabHandler}
            className={styles.nav}
          >
            {wizardSteps.map((step) => (
              <WizardNavItem key={step.step} step={step} />
            ))}

            {/* spacer */}
            <div className="flex-grow-1" />

            <PermissionsToolbar
              modComponentFormState={modComponentFormState}
              disabled={!isValid}
            />

            <ReloadToolbar modComponentFormState={modComponentFormState} />
          </Nav>

          {status && <div className="text-danger">{status}</div>}
          <Tab.Content className={styles.content}>
            {wizardSteps.map(({ Component, step }) => (
              <Component key={step} eventKey={step} />
            ))}
          </Tab.Content>
        </BootstrapForm>
      </AnalysisAnnotationsContext.Provider>
    </Tab.Container>
  );
};

export default ModComponentFormStateWizard;
