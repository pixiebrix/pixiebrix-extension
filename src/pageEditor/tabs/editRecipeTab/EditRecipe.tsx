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
import Effect from "@/pageEditor/components/Effect";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import styles from "./EditRecipe.module.scss";
import { FieldDescriptions } from "@/utils/strings";
import { object, string } from "yup";
import { testIsSemVerString } from "@/types/helpers";
import Form, { RenderBody } from "@/components/form/Form";
import { selectExtensions } from "@/store/extensionsSelectors";
import { getRecipeById } from "@/pageEditor/utils";
import Alert from "@/components/Alert";
import { createSelector } from "reselect";

// TODO: This should be yup.SchemaOf<RecipeMetadataFormState> but we can't set the `id` property to `RegistryId`
// see: https://github.com/jquense/yup/issues/1183#issuecomment-749186432
const editRecipeSchema = object({
  id: string().required(), // Recipe id is readonly here
  name: string().required(),
  version: string()
    .test(
      "semver",
      "Version must follow the X.Y.Z semantic version format, without a leading 'v'",
      (value: string) => testIsSemVerString(value, { allowLeadingV: false })
    )
    .required(),
  description: string(),
});

const selectFirstExtension = createSelector(
  selectExtensions,
  selectActiveRecipeId,
  (extensions, activeRecipeId) =>
    extensions.find((x) => x._recipe?.id === activeRecipeId)
);

const EditRecipe: React.VoidFunctionComponent = () => {
  const recipeId = useSelector(selectActiveRecipeId);
  const { data: recipes, isLoading, error } = useGetRecipesQuery();
  const recipe = getRecipeById(recipes ?? [], recipeId);

  // Select a single extension for the recipe to check the installed version.
  // We rely on the assumption that every extension in the recipe has the same version.
  const recipeExtension = useSelector(selectFirstExtension);

  const installedRecipeVersion = recipeExtension?._recipe.version;
  const latestRecipeVersion = recipe?.metadata?.version;

  const dirtyMetadata = useSelector(selectDirtyMetadataForRecipeId(recipeId));
  const savedMetadata = recipe?.metadata;
  const metadata = dirtyMetadata ?? savedMetadata;

  const initialFormState: RecipeMetadataFormState = {
    id: metadata?.id,
    name: metadata?.name,
    version: metadata?.version,
    description: metadata?.description,
  };

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

  const renderBody: RenderBody = ({ values }) => (
    <>
      <Effect values={values} onChange={updateRedux} delayMillis={100} />

      <Card>
        <Card.Header>Blueprint Metadata</Card.Header>
        <Card.Body>
          {installedRecipeVersion !== latestRecipeVersion && (
            <Alert variant="warning">
              You are editing version {installedRecipeVersion} of this
              blueprint, the latest version is {latestRecipeVersion}. To get the
              latest version,{" "}
              <a
                href="/options.html#/blueprints"
                target="_blank"
                title="Re-activate the blueprint"
              >
                re-activate the blueprint
              </a>
            </Alert>
          )}
          <ConnectedFieldTemplate
            name="id"
            label="Blueprint ID"
            description={FieldDescriptions.BLUEPRINT_ID}
            // Blueprint IDs may not be changed after creation
            readOnly
          />
          <ConnectedFieldTemplate
            name="name"
            label="Name"
            description={FieldDescriptions.BLUEPRINT_NAME}
          />
          <ConnectedFieldTemplate
            name="version"
            label="Version"
            description={FieldDescriptions.BLUEPRINT_VERSION}
          />
          <ConnectedFieldTemplate
            name="description"
            label="Description"
            description={FieldDescriptions.BLUEPRINT_DESCRIPTION}
          />
        </Card.Body>
      </Card>
    </>
  );

  return (
    <Container fluid className={styles.root}>
      <Row className={styles.row}>
        <Col sm={11} md={10} lg={9} xl={8}>
          <ErrorBoundary>
            <Form
              validationSchema={editRecipeSchema}
              initialValues={initialFormState}
              onSubmit={() => {
                console.error(
                  "The form's submit should not be called to save recipe metadata. Use 'saveRecipe' from 'useRecipeSaver' instead."
                );
              }}
              renderBody={renderBody}
              renderSubmit={() => null}
            />
          </ErrorBoundary>
        </Col>
      </Row>
    </Container>
  );
};

export default EditRecipe;
