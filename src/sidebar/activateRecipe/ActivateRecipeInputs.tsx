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

import React, { useCallback, useEffect, useState } from "react";
import { type RecipeDefinition } from "@/types/definitions";
import useWizard from "@/options/pages/marketplace/useWizard";
import Form, {
  type OnSubmit,
  type RenderBody,
  type RenderSubmit,
} from "@/components/form/Form";
import styles from "./ActivateRecipePanel.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt, faMagic } from "@fortawesome/free-solid-svg-icons";
import { type WizardValues } from "@/options/pages/marketplace/wizardTypes";
import { Button, Col } from "react-bootstrap";
import useActivateRecipe from "@/hooks/activateRecipe/useActivateRecipe";
import Alert from "@/components/Alert";
import cx from "classnames";
import Effect from "@/components/Effect";
import { collectPermissions } from "@/permissions";
import { resolveRecipe } from "@/registry/internal";
import { containsPermissions } from "@/background/messenger/api";
import permissionsDialogImage from "@img/example-permissions-dialog.png";
import useQuickbarShortcut from "@/hooks/useQuickbarShortcut";
import { useAsyncEffect } from "use-async-effect";
import { useAsyncState } from "@/hooks/common";
import includesQuickBarExtensionPoint from "@/utils/includesQuickBarExtensionPoint";

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [needsPermissions, setNeedsPermissions] = useState(false);
  const [includesQuickbar, setIncludesQuickbar] = useState(false);

  const [resolvedRecipeConfigs] = useAsyncState(
    async () => resolveRecipe(recipe, recipe.extensionPoints),
    [recipe]
  );

  useAsyncEffect(async () => {
    setIncludesQuickbar(
      await includesQuickBarExtensionPoint(resolvedRecipeConfigs)
    );
  }, [resolvedRecipeConfigs]);

  const { isConfigured: isQuickbarShortcutConfigured } = useQuickbarShortcut();
  const needsQuickBarShortcut =
    includesQuickbar && !isQuickbarShortcutConfigured;

  const checkPermissions = useCallback(
    async (values: WizardValues) => {
      if (!resolvedRecipeConfigs) {
        return;
      }

      const serviceAuths = values.services.filter(({ config }) =>
        Boolean(config)
      );
      const collectedPermissions = await collectPermissions(
        resolvedRecipeConfigs,
        serviceAuths
      );
      setNeedsPermissions(!(await containsPermissions(collectedPermissions)));
    },
    [resolvedRecipeConfigs]
  );

  function onChange(values: WizardValues) {
    void checkPermissions(values);
  }

  // Check permissions on initial load
  useEffect(() => {
    if (resolvedRecipeConfigs) {
      void checkPermissions(initialValues);
    }
  }, [checkPermissions, initialValues, resolvedRecipeConfigs]);

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
      {needsQuickBarShortcut && (
        <Alert variant="info" className="mt-3">
          <span className={styles.permissionsBold}>
            You&apos;re going to need a Quick Bar shortcut.
          </span>
          <div className="my-2">
            <Button
              variant="info"
              href="chrome://extensions/shortcuts"
              onClick={(event) => {
                // // Can't link to chrome:// URLs directly
                event.preventDefault();
                // `react-bootstrap` will render as an anchor tag when href is set
                void browser.tabs.create({
                  url: (event.currentTarget as HTMLAnchorElement).href,
                });
              }}
            >
              Set up Quick Bar shortcut
            </Button>
          </div>
          <div>
            <a href="https://docs.pixiebrix.com/quick-bar-setup">
              Learn more <FontAwesomeIcon icon={faExternalLinkAlt} />
            </a>
          </div>
        </Alert>
      )}
    </div>
  );

  const renderSubmit: RenderSubmit = ({ isSubmitting }) => (
    <>
      {submitError && (
        <Alert variant="danger" className="m-3">
          {submitError}
        </Alert>
      )}
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
      setSubmitError(error);
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
