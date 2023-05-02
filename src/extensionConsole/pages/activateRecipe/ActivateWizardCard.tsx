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

import styles from "./ActivateWizard.module.scss";

import React from "react";
import { type RecipeDefinition } from "@/types/recipeTypes";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Card, Col, Form, Row } from "react-bootstrap";
import { truncate } from "lodash";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Formik } from "formik";
import { useTitle } from "@/hooks/title";
import useExtensionConsoleInstall from "@/extensionConsole/pages/blueprints/utils/useExtensionConsoleInstall";
import useWizard from "@/activation/useWizard";
import ActivateButton from "@/extensionConsole/pages/activateRecipe/ActivateButton";
import useInstallableViewItems from "@/extensionConsole/pages/blueprints/useInstallableViewItems";
import BlockFormSubmissionViaEnterIfFirstChild from "@/components/BlockFormSubmissionViaEnterIfFirstChild";
import ReduxPersistenceContext, {
  type ReduxPersistenceContextType,
} from "@/store/ReduxPersistenceContext";
import { persistor } from "@/store/optionsStore";

interface OwnProps {
  blueprint: RecipeDefinition;
  isReinstall: boolean;
}

const ActivateHeader: React.FunctionComponent<{
  blueprint: RecipeDefinition;
}> = ({ blueprint }) => {
  const { installableViewItems } = useInstallableViewItems([blueprint]);

  const installableViewItem = installableViewItems[0];

  return (
    <Card.Header className={styles.wizardHeader}>
      <Row>
        <Col>
          <div className={styles.wizardHeaderLayout}>
            <div className={styles.wizardMainInfo}>
              <span className={styles.blueprintIcon}>
                {installableViewItem.icon}
              </span>
              <span>
                <Card.Title>{installableViewItem.name}</Card.Title>
                <code className={styles.packageId}>
                  {installableViewItem.sharing.packageId}
                </code>
              </span>
            </div>
            <div className={styles.wizardDescription}>
              {installableViewItem.description}
            </div>
          </div>
          <div className={styles.activateButtonContainer}>
            <ActivateButton blueprint={blueprint} />
          </div>
        </Col>
      </Row>
    </Card.Header>
  );
};

const ActivateWizardCard: React.FunctionComponent<OwnProps> = ({
  blueprint,
  isReinstall,
}) => {
  const [blueprintSteps, initialValues, validationSchema] =
    useWizard(blueprint);

  const install = useExtensionConsoleInstall(blueprint);

  const action = isReinstall ? "Reactivate" : "Activate";
  useTitle(`${action} ${truncate(blueprint.metadata.name, { length: 15 })}`);

  const reduxPersistenceContext: ReduxPersistenceContextType = {
    async flush() {
      await persistor.flush();
    },
  };

  return (
    <ReduxPersistenceContext.Provider value={reduxPersistenceContext}>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={install}
      >
        {({ handleSubmit }) => (
          <Form id="activate-wizard" onSubmit={handleSubmit}>
            <BlockFormSubmissionViaEnterIfFirstChild />
            <Card>
              <ActivateHeader blueprint={blueprint} />
              <Card.Body className={styles.wizardBody}>
                {blueprintSteps.map(({ Component, label, key }) => (
                  <div key={key} className={styles.wizardBodyRow}>
                    <div>
                      <h4>{label}</h4>
                    </div>
                    <Component blueprint={blueprint} reinstall={isReinstall} />
                  </div>
                ))}
              </Card.Body>
            </Card>
          </Form>
        )}
      </Formik>
    </ReduxPersistenceContext.Provider>
  );
};

export default ActivateWizardCard;
