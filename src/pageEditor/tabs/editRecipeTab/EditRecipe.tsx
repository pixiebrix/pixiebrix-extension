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

import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveRecipeId,
  selectDirtyMetadataForRecipeId,
} from "@/pageEditor/slices/editorSelectors";
import { useGetRecipesQuery } from "@/services/api";
import { RecipeMetadataFormState } from "@/types/definitions";
import { Card, Col, Container, Row } from "react-bootstrap";
import Loader from "@/components/Loader";
import { getErrorMessage } from "@/errors";
import { actions } from "@/pageEditor/slices/editorSlice";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Formik } from "formik";
import Effect from "@/pageEditor/components/Effect";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import styles from "./EditRecipe.module.scss";

const EditRecipe: React.VoidFunctionComponent = () => {
  const recipeId = useSelector(selectActiveRecipeId);
  const { data: recipes, isLoading, error } = useGetRecipesQuery();
  const savedMetadata = recipes?.find(
    (recipe) => recipe.metadata.id === recipeId
  )?.metadata;
  const isSaved = Boolean(savedMetadata);
  const dirtyMetadata = useSelector(selectDirtyMetadataForRecipeId(recipeId));
  const metadata = dirtyMetadata ?? savedMetadata;

  const initialFormState: RecipeMetadataFormState = {
    id: metadata?.id,
    name: metadata?.name,
    version: metadata?.version,
    description: metadata?.description,
  };

  const initialValues = { metadata: initialFormState };

  const dispatch = useDispatch();
  const updateRedux = useCallback(
    (metadata: RecipeMetadataFormState) => {
      dispatch(actions.editRecipeMetadata(metadata));
    },
    [dispatch]
  );

  if (isLoading || error) {
    return (
      <Container>
        <Row>
          <Col>
            {isLoading ? (
              <Loader />
            ) : (
              <div className="text-danger">{getErrorMessage(error)}</div>
            )}
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container fluid className={styles.root}>
      <Row className={styles.row}>
        <Col sm={11} md={10} lg={9} xl={8}>
          <ErrorBoundary>
            <Formik
              initialValues={initialValues}
              onSubmit={() => {
                console.error(
                  "Formik's submit should not be called to save recipe metadata. Use 'saveRecipe' from 'useRecipeSaver' instead."
                );
              }}
            >
              {({ values }) => (
                <>
                  <Effect
                    values={values.metadata}
                    onChange={updateRedux}
                    delayMillis={100}
                  />

                  <Card>
                    <Card.Header>Blueprint Metadata</Card.Header>
                    <Card.Body>
                      <ConnectedFieldTemplate
                        name="metadata.id"
                        label="Blueprint ID"
                        description="The registry ID of this blueprint"
                        readOnly={isSaved}
                      />
                      <ConnectedFieldTemplate
                        name="metadata.name"
                        label="Name"
                      />
                      <ConnectedFieldTemplate
                        name="metadata.version"
                        label="Version"
                      />
                      <ConnectedFieldTemplate
                        name="metadata.description"
                        label="Description"
                      />
                    </Card.Body>
                  </Card>
                </>
              )}
            </Formik>
          </ErrorBoundary>
        </Col>
      </Row>
    </Container>
  );
};

export default EditRecipe;
