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

import styles from "./ElementWizard.module.scss";

import React, { useState } from "react";
import { useFormikContext } from "formik";
import { Form as BootstrapForm, Nav, Tab } from "react-bootstrap";
import { actions } from "@/pageEditor/slices/editorSlice";
import { useAsyncState } from "@/hooks/common";
import ReloadToolbar from "@/pageEditor/toolbar/ReloadToolbar";
import ActionToolbar from "@/pageEditor/toolbar/ActionToolbar";
import { WizardStep } from "@/pageEditor/extensionPoints/base";
import PermissionsToolbar from "@/pageEditor/toolbar/PermissionsToolbar";
import LogsTab, { LOGS_EVENT_KEY } from "@/pageEditor/tabs/logs/LogsTab";
import { thisTab } from "@/pageEditor/utils";
import { checkAvailable } from "@/contentScript/messenger/api";
import EditTab from "@/pageEditor/tabs/editTab/EditTab";
import useSavingWizard from "./panes/save/useSavingWizard";
import { useDispatch } from "react-redux";
import { produce } from "immer";
import { useAsyncEffect } from "use-async-effect";
import { upgradePipelineToV3 } from "@/pageEditor/extensionPoints/upgrade";
import AskQuestionModalButton from "./askQuestion/AskQuestionModalButton";
import cx from "classnames";
import LogNavItemBadge from "./tabs/logs/NavItemBadge";
import { logActions } from "@/components/logViewer/logSlice";
import useRecipeSaver from "@/pageEditor/panes/save/useRecipeSaver";
import { FormState } from "@/pageEditor/pageEditorTypes";

const EDIT_STEP_NAME = "Edit";
const LOG_STEP_NAME = "Logs";

const wizard: WizardStep[] = [
  { step: EDIT_STEP_NAME, Component: EditTab },
  { step: LOG_STEP_NAME, Component: LogsTab },
];

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
 * @see RecipePane
 */
const ElementWizard: React.FunctionComponent<{
  element: FormState;
  editable: Set<string>;
}> = ({ element, editable }) => {
  const [step, setStep] = useState(wizard[0].step);

  const availableDefinition = element.extensionPoint.definition.isAvailable;
  const [available] = useAsyncState(
    async () => checkAvailable(thisTab, availableDefinition),
    [availableDefinition]
  );

  const { isValid, status, handleReset, setStatus } =
    useFormikContext<FormState>();

  const { isSaving: isSavingWizard, save } = useSavingWizard();
  const { save: saveRecipe, isSaving: isSavingRecipe } = useRecipeSaver();
  const isSaving = isSavingRecipe || isSavingWizard;

  const onSave = async () => {
    try {
      if (element.recipe) {
        await saveRecipe(element.recipe.id);
      } else {
        await save();
      }
    } catch (error) {
      setStatus(error);
    }
  };

  const dispatch = useDispatch();

  const refreshEntries = () => {
    dispatch(logActions.refreshEntries());
  };

  const selectTabHandler = (step: string) => {
    setStep(step);
    if (step.toLowerCase() === LOGS_EVENT_KEY.toLowerCase()) {
      // If user is clicking over to the logs tab, they most likely want to see the most recent logs
      refreshEntries();
    }
  };

  const { values: formState, setValues: setFormState } =
    useFormikContext<FormState>();

  const wizardSteps = [...wizard];

  useAsyncEffect(async () => {
    if (formState.apiVersion === "v2") {
      const newState = await produce(formState, async (draft) => {
        draft.extension.blockPipeline = await upgradePipelineToV3(
          draft.extension.blockPipeline
        );
        draft.apiVersion = "v3";
      });
      setFormState(newState);
      dispatch(actions.showV3UpgradeMessage());
    }
  }, []);

  return (
    <Tab.Container activeKey={step} key={element.uuid}>
      <BootstrapForm
        autoComplete="off"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
        }}
        onReset={handleReset}
        className={cx(styles.form, "full-height")}
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
          <div className="mr-2" />

          <AskQuestionModalButton />

          {/* spacer */}
          <div className="flex-grow-1" />

          <PermissionsToolbar
            element={element}
            disabled={isSaving || !isValid}
          />

          <ReloadToolbar element={element} disabled={isSaving} />

          <ActionToolbar
            element={element}
            disabled={isSaving}
            onSave={onSave}
          />
        </Nav>

        {status && <div className="text-danger">{status}</div>}
        <Tab.Content className={styles.content}>
          {wizardSteps.map(({ Component, step }) => (
            <Component
              key={step}
              eventKey={step}
              editable={editable}
              available={available}
            />
          ))}
        </Tab.Content>
      </BootstrapForm>
    </Tab.Container>
  );
};

export default ElementWizard;
