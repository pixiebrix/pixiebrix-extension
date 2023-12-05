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

import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveRecipeId,
  selectDirtyMetadataForRecipeId,
} from "@/pageEditor/slices/editorSelectors";
import { Card, Col, Container, Row } from "react-bootstrap";
import Loader from "@/components/Loader";
import { getErrorMessage } from "@/errors/errorHelpers";
import { actions } from "@/pageEditor/slices/editorSlice";
import ErrorBoundary from "@/components/ErrorBoundary";
import Effect from "@/components/Effect";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import styles from "./ModMetadataEditor.module.scss";
import { object, string } from "yup";
import { testIsSemVerString } from "@/types/helpers";
import Form, { type RenderBody } from "@/components/form/Form";
import { selectExtensions } from "@/store/extensionsSelectors";
import Alert from "@/components/Alert";
import { createSelector } from "@reduxjs/toolkit";
import { lt } from "semver";
import { useOptionalModDefinition } from "@/modDefinitions/modDefinitionHooks";
import { type ModMetadataFormState } from "@/pageEditor/pageEditorTypes";
import { FieldDescriptions } from "@/modDefinitions/modDefinitionConstants";
import IntegrationsSliceModIntegrationsContextAdapter from "@/integrations/store/IntegrationsSliceModIntegrationsContextAdapter";

// TODO: This should be yup.SchemaOf<RecipeMetadataFormState> but we can't set the `id` property to `RegistryId`
// see: https://github.com/jquense/yup/issues/1183#issuecomment-749186432
const editModSchema = object({
  id: string().required(), // Recipe id is readonly here
  name: string().required(),
  version: string()
    .test(
      "semver",
      "Version must follow the X.Y.Z semantic version format, without a leading 'v'",
      (value: string) => testIsSemVerString(value, { allowLeadingV: false }),
    )
    .required(),
  description: string(),
});

const selectFirstModComponent = createSelector(
  selectExtensions,
  selectActiveRecipeId,
  (extensions, activeRecipeId) =>
    extensions.find((x) => x._recipe?.id === activeRecipeId),
);

const ModMetadataEditor: React.VoidFunctionComponent = () => {
  const modId = useSelector(selectActiveRecipeId);
  const {
    data: modDefinition,
    isFetching,
    error,
  } = useOptionalModDefinition(modId);

  // Select a single mod component for the mod to check the installed version.
  // We rely on the assumption that every component in the mod has the same version.
  const modDefinitionComponent = useSelector(selectFirstModComponent);

  const installedModVersion = modDefinitionComponent?._recipe.version;
  const latestModVersion = modDefinition?.metadata?.version;
  const showOldModVersionWarning =
    installedModVersion &&
    latestModVersion &&
    lt(installedModVersion, latestModVersion);

  const dirtyMetadata = useSelector(selectDirtyMetadataForRecipeId(modId));
  const savedMetadata = modDefinition?.metadata;
  const metadata = dirtyMetadata ?? savedMetadata;

  const initialFormState: ModMetadataFormState = {
    id: metadata?.id,
    name: metadata?.name,
    version: metadata?.version,
    description: metadata?.description,
  };

  const dispatch = useDispatch();
  const updateRedux = useCallback(
    (metadata: ModMetadataFormState) => {
      dispatch(actions.editRecipeMetadata(metadata));
    },
    [dispatch],
  );

  if (isFetching || error) {
    return (
      <Container>
        <Row>
          <Col>
            {isFetching ? (
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
    <IntegrationsSliceModIntegrationsContextAdapter>
      <Effect values={values} onChange={updateRedux} delayMillis={100} />

      <Card>
        <Card.Header>Mod Metadata</Card.Header>
        <Card.Body>
          {showOldModVersionWarning && (
            <Alert variant="warning">
              You are editing version {installedModVersion} of this mod, the
              latest version is {latestModVersion}. To get the latest version,{" "}
              <a
                href="/options.html#/mods"
                target="_blank"
                title="Re-activate the mod"
              >
                re-activate the mod
              </a>
            </Alert>
          )}
          <ConnectedFieldTemplate
            name="id"
            label="Mod ID"
            description={FieldDescriptions.MOD_ID}
            // Mod IDs may not be changed after creation
            readOnly
          />
          <ConnectedFieldTemplate
            name="name"
            label="Name"
            description={FieldDescriptions.MOD_NAME}
          />
          <ConnectedFieldTemplate
            name="version"
            label="Version"
            description={FieldDescriptions.MOD_VERSION}
          />
          <ConnectedFieldTemplate
            name="description"
            label="Description"
            description={FieldDescriptions.MOD_DESCRIPTION}
          />
        </Card.Body>
      </Card>
    </IntegrationsSliceModIntegrationsContextAdapter>
  );

  return (
    <Container fluid className={styles.root}>
      <Row className={styles.row}>
        <Col sm={11} md={10} lg={9} xl={8}>
          <ErrorBoundary>
            <Form
              validationSchema={editModSchema}
              initialValues={initialFormState}
              onSubmit={() => {
                console.error(
                  "The form's submit should not be called to save recipe metadata. Use 'saveRecipe' from 'useRecipeSaver' instead.",
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

export default ModMetadataEditor;
