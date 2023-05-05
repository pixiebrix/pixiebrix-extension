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

import styles from "./ActivateRecipeCard.module.scss";

import React from "react";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Card, Col, Form, Row } from "react-bootstrap";
import { truncate } from "lodash";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Formik } from "formik";
import { useTitle } from "@/hooks/title";
import useExtensionConsoleInstall from "@/extensionConsole/pages/blueprints/utils/useExtensionConsoleInstall";
import useWizard from "@/activation/useWizard";
import ActivateButton from "@/extensionConsole/pages/activateRecipe/ActivateButton";
import BlockFormSubmissionViaEnterIfFirstChild from "@/components/BlockFormSubmissionViaEnterIfFirstChild";
import ReduxPersistenceContext, {
  type ReduxPersistenceContextType,
} from "@/store/ReduxPersistenceContext";
import { persistor } from "@/store/optionsStore";
import { useSelector } from "react-redux";
import { selectRecipeHasAnyExtensionsInstalled } from "@/store/extensionsSelectors";
import { useRecipeIdParam } from "@/extensionConsole/pages/pageHelpers";
import { useGetRecipeQuery } from "@/services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCubes } from "@fortawesome/free-solid-svg-icons";

const ActivateRecipeCard: React.FC = () => {
  const recipeId = useRecipeIdParam();
  const isReinstall = useSelector(
    selectRecipeHasAnyExtensionsInstalled(recipeId)
  );
  const actionText = isReinstall ? "Reactivate" : "Activate";
  // Page parent component is gating this content component on isFetching, so
  // recipe will always be resolved here
  const { data: recipe } = useGetRecipeQuery({ recipeId }, { skip: !recipeId });

  const [wizardSteps, initialValues, validationSchema] = useWizard(recipe);

  const install = useExtensionConsoleInstall(recipe);

  useTitle(`${actionText} ${truncate(recipe.metadata.name, { length: 15 })}`);

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
              <Card.Header className={styles.wizardHeader}>
                <Row>
                  <Col>
                    <div className={styles.wizardHeaderLayout}>
                      <div className={styles.wizardMainInfo}>
                        <span className={styles.blueprintIcon}>
                          <FontAwesomeIcon icon={faCubes} size="2x" />
                        </span>
                        <span>
                          <Card.Title>{recipe.metadata.name}</Card.Title>
                          <code className={styles.packageId}>
                            {recipe.metadata.id}
                          </code>
                        </span>
                      </div>
                      <div className={styles.wizardDescription}>
                        {recipe.metadata.description}
                      </div>
                    </div>
                    <div className={styles.activateButtonContainer}>
                      <ActivateButton blueprint={recipe} />
                    </div>
                  </Col>
                </Row>
              </Card.Header>
              <Card.Body className={styles.wizardBody}>
                {wizardSteps.map(({ Component, label, key }) => (
                  <div key={key} className={styles.wizardBodyRow}>
                    <div>
                      <h4>{label}</h4>
                    </div>
                    <Component blueprint={recipe} reinstall={isReinstall} />
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

export default ActivateRecipeCard;
