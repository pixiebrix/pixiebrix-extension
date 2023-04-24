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
import { type RecipeDefinition } from "@/types/recipeTypes";
import Form, {
  type RenderBody,
  type RenderSubmit,
} from "@/components/form/Form";
import styles from "./ActivateRecipePanel.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagic } from "@fortawesome/free-solid-svg-icons";
import { type WizardStep, type WizardValues } from "@/activation/wizardTypes";
import { Button, Col } from "react-bootstrap";
import Alert from "@/components/Alert";
import cx from "classnames";
import Effect from "@/components/Effect";
import permissionsDialogImage from "@img/example-permissions-dialog.png";
import { type AnyObjectSchema } from "yup";
import { useSelector } from "react-redux";
import { selectExtensionsForRecipe } from "@/store/extensionsSelectors";
import { isEmpty } from "lodash";

type ActivateRecipeInputsProps = {
  recipe: RecipeDefinition;
  wizardSteps: WizardStep[];
  initialValues: WizardValues;
  onChange: (values: WizardValues) => void;
  validationSchema: AnyObjectSchema;
  onClickCancel: () => void;
  needsPermissions?: boolean;
  header?: React.ReactNode;
  formValuesRef?: React.MutableRefObject<WizardValues>;
  onClickSubmit?: () => void;
  activationError?: string;
};

const ActivateRecipeInputs: React.FC<ActivateRecipeInputsProps> = ({
  recipe,
  wizardSteps,
  initialValues,
  onChange,
  validationSchema,
  onClickCancel,
  needsPermissions,
  header,
  onClickSubmit,
  activationError,
}) => {
  const optionsStep = wizardSteps.find(({ key }) => key === "options");
  const servicesStep = wizardSteps.find(({ key }) => key === "services");

  const recipeExtensions = useSelector(
    selectExtensionsForRecipe(recipe?.metadata?.id)
  );
  const isReinstall = !isEmpty(recipeExtensions);

  const renderBody: RenderBody = ({ values }) => (
    <div className={cx("scrollable-area", styles.formBody)}>
      <Effect values={values} onChange={onChange} delayMillis={200} />
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
      {needsPermissions && (
        <Alert variant="info" className="mt-3">
          <span className={styles.permissionsBold}>
            Pixiebrix needs some permissions.
          </span>
          <div className="my-2">
            <img
              src={permissionsDialogImage}
              alt="Example Chrome permissions dialog"
              width={300}
            />
          </div>
          <div>
            Without permissions, PixieBrix won&apos;t work. We&apos;ll ask for
            these in just a second.
          </div>
        </Alert>
      )}
    </div>
  );

  const renderSubmit: RenderSubmit = () => (
    <>
      {activationError && (
        <Alert variant="danger" className="m-3">
          {activationError}
        </Alert>
      )}
      <div className={styles.footer}>
        <Button type="button" variant="outline-danger" onClick={onClickCancel}>
          Cancel
        </Button>
        <Button type="submit">
          <FontAwesomeIcon icon={faMagic} /> Finish Activating
        </Button>
      </div>
    </>
  );

  return (
    <Form
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onClickSubmit}
      renderBody={renderBody}
      renderSubmit={renderSubmit}
      className={styles.form}
    />
  );
};

export default ActivateRecipeInputs;
