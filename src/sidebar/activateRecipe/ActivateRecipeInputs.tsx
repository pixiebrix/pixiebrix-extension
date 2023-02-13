/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import React from "react";
import { type RecipeDefinition } from "@/types/definitions";
import useWizard from "@/options/pages/marketplace/useWizard";
import Form, {
  type OnSubmit,
  type RenderBody,
  type RenderSubmit,
} from "@/components/form/Form";
import styles from "./ActivateRecipePanel.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagic } from "@fortawesome/free-solid-svg-icons";
import { type WizardValues } from "@/options/pages/marketplace/wizardTypes";
import { Button } from "react-bootstrap";
import useActivateRecipe from "@/hooks/useActivateRecipe";
import Alert from "@/components/Alert";
import cx from "classnames";

type ActivateRecipeInputsProps = {
  recipe: RecipeDefinition;
  isReinstall: boolean;
  submitButtonRef?: React.RefObject<HTMLButtonElement>;
  onSubmitSuccess?: () => void;
};

const ActivateRecipeInputs: React.FC<ActivateRecipeInputsProps> = ({
  recipe,
  isReinstall,
  submitButtonRef,
  onSubmitSuccess,
}) => {
  const [wizardSteps, initialValues, validationSchema] = useWizard(recipe);
  const activateRecipe = useActivateRecipe();
  const [error, setError] = React.useState<string | null>(null);

  const renderBody: RenderBody = () => (
    <div className={cx("scrollable-area", styles.formBody)}>
      {wizardSteps.map(({ Component, label, key }) => (
        <div key={key} className={styles.wizardStepRow}>
          <div>
            <h4>{label}</h4>
          </div>
          <Component blueprint={recipe} reinstall={isReinstall} />
        </div>
      ))}
    </div>
  );

  const renderSubmit: RenderSubmit = ({ isSubmitting, isValid }) => (
    <>
      {error && <Alert variant={"danger"}>{error}</Alert>}
      <div className={styles.footer}>
        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
          ref={submitButtonRef}
        >
          <FontAwesomeIcon icon={faMagic} /> Finish Activating
        </Button>
      </div>
    </>
  );

  const onSubmit: OnSubmit<WizardValues> = async (values) => {
    const { success, error } = await activateRecipe(values, recipe);
    if (success) {
      onSubmitSuccess?.();
    } else {
      setError(error);
    }
  };

  return (
    <Form
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
      renderBody={renderBody}
      renderSubmit={renderSubmit}
      className={styles.form}
    />
  );
};

export default ActivateRecipeInputs;
