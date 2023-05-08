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

import React, { useState } from "react";
import { Button, Card, Col, Row } from "react-bootstrap";
import { truncate } from "lodash";
import { useTitle } from "@/hooks/title";
import useWizard from "@/activation/useWizard";
import BlockFormSubmissionViaEnterIfFirstChild from "@/components/BlockFormSubmissionViaEnterIfFirstChild";
import ReduxPersistenceContext, {
  type ReduxPersistenceContextType,
} from "@/store/ReduxPersistenceContext";
import { persistor } from "@/store/optionsStore";
import { useDispatch, useSelector } from "react-redux";
import { selectRecipeHasAnyExtensionsInstalled } from "@/store/extensionsSelectors";
import { useRecipeIdParam } from "@/extensionConsole/pages/useRecipeIdParam";
import { useCreateMilestoneMutation, useGetRecipeQuery } from "@/services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCubes, faMagic } from "@fortawesome/free-solid-svg-icons";
import useActivateRecipe from "@/activation/useActivateRecipe";
import useMilestones from "@/hooks/useMilestones";
import Form, { type OnSubmit, type RenderBody } from "@/components/form/Form";
import { type WizardValues } from "@/activation/wizardTypes";
import Alert from "@/components/Alert";
import notify from "@/utils/notify";
import blueprintsSlice from "@/extensionConsole/pages/blueprints/blueprintsSlice";
import { BLUEPRINTS_PAGE_TABS } from "@/extensionConsole/pages/blueprints/BlueprintsPageSidebar";
import { push } from "connected-react-router";

const ActivateRecipeCard: React.FC = () => {
  const dispatch = useDispatch();
  const recipeId = useRecipeIdParam();
  const isReactivate = useSelector(
    selectRecipeHasAnyExtensionsInstalled(recipeId)
  );
  const actionText = isReactivate ? "Reactivate" : "Activate";
  // Page parent component is gating this content component on isFetching, so
  // recipe will always be resolved here
  const { data: recipe } = useGetRecipeQuery({ recipeId }, { skip: !recipeId });

  const [wizardSteps, initialValues, validationSchema] = useWizard(recipe);

  const activateRecipe = useActivateRecipe("extensionConsole");
  const [activationError, setActivationError] = useState<unknown>();
  const [createMilestone] = useCreateMilestoneMutation();
  const { hasMilestone } = useMilestones();

  useTitle(`${actionText} ${truncate(recipe.metadata.name, { length: 15 })}`);

  const reduxPersistenceContext: ReduxPersistenceContextType = {
    async flush() {
      await persistor.flush();
    },
  };

  const renderBody: RenderBody = ({ values, isSubmitting }) => (
    <>
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
                <Button
                  className="text-nowrap"
                  type="submit"
                  disabled={isSubmitting}
                >
                  <FontAwesomeIcon icon={faMagic} />{" "}
                  {isReactivate ? "Reactivate" : "Activate"}
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body className={styles.wizardBody}>
          {activationError && <Alert variant="danger">{activationError}</Alert>}
          {wizardSteps.map(({ Component, label, key }) => (
            <div key={key} className={styles.wizardBodyRow}>
              <div>
                <h4>{label}</h4>
              </div>
              <Component blueprint={recipe} reinstall={isReactivate} />
            </div>
          ))}
        </Card.Body>
      </Card>
    </>
  );

  const onSubmit: OnSubmit<WizardValues> = async (values, helpers) => {
    const { success, error } = await activateRecipe(values, recipe);

    if (success) {
      notify.success(`Installed ${recipe.metadata.name}`);

      if (!hasMilestone("first_time_public_blueprint_install")) {
        await createMilestone({
          key: "first_time_public_blueprint_install",
          metadata: {
            blueprintId: recipeId,
          },
        });

        dispatch(
          blueprintsSlice.actions.setActiveTab(BLUEPRINTS_PAGE_TABS.getStarted)
        );
      }

      dispatch(push("/mods"));
    } else {
      setActivationError(error);
    }
  };

  return (
    <ReduxPersistenceContext.Provider value={reduxPersistenceContext}>
      <Form
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={onSubmit}
        renderBody={renderBody}
        renderSubmit={() => null}
      />
    </ReduxPersistenceContext.Provider>
  );
};

export default ActivateRecipeCard;
