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
import { Button, Col } from "react-bootstrap";
import useActivateRecipe from "@/hooks/useActivateRecipe";
import Alert from "@/components/Alert";
import cx from "classnames";

type ActivateRecipeInputsProps = {
  recipe: RecipeDefinition;
  isReinstall: boolean;
  onClickCancel: () => void;
  header?: React.ReactNode;
  submitButtonRef?: React.RefObject<HTMLButtonElement>;
  onSubmitSuccess?: () => void;
};

const ActivateRecipeInputs: React.FC<ActivateRecipeInputsProps> = ({
  recipe,
  isReinstall,
  onClickCancel,
  header,
  submitButtonRef,
  onSubmitSuccess,
}) => {
  const [wizardSteps, initialValues, validationSchema] = useWizard(recipe);
  const optionsStep = wizardSteps.find(({ key }) => key === "options");
  const servicesStep = wizardSteps.find(({ key }) => key === "services");
  const activateRecipe = useActivateRecipe();
  const [error, setError] = React.useState<string | null>(null);

  const renderBody: RenderBody = () => (
    <div className={cx("scrollable-area", styles.formBody)}>
      {header}
      {optionsStep && (
        <>
          <div>
            <h4>{optionsStep.label}</h4>
          </div>
          {/*
            Need to use Col for correct spacing here because the options
            component ends up using FieldTemplate to render the option inputs,
            and FieldTemplate renders as a Row in the layout, and using a Row
            without a wrapping column causes horizontal scrollbars to appear
            for no reason. Also, the css style here adds negative margin to
            bring everything back in line.
          */}
          <Col className={styles.optionsBody}>
            <optionsStep.Component blueprint={recipe} reinstall={isReinstall} />
          </Col>
        </>
      )}
      {servicesStep && (
        <div className="mt-1">
          <div>
            <h4>{servicesStep.label}</h4>
          </div>
          <servicesStep.Component blueprint={recipe} reinstall={isReinstall} />
        </div>
      )}
    </div>
  );

  const renderSubmit: RenderSubmit = ({ isSubmitting }) => (
    <>
      {error && <Alert variant={"danger"}>{error}</Alert>}
      <div className={styles.footer}>
        <Button type="button" variant="outline-danger" onClick={onClickCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} ref={submitButtonRef}>
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
