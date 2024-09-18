/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
  selectActiveModId,
  selectDirtyMetadataForModId,
  selectFirstModComponentFormStateForActiveMod,
} from "@/pageEditor/store/editor/editorSelectors";
import { Card, Container } from "react-bootstrap";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import ErrorBoundary from "@/components/ErrorBoundary";
import Effect from "@/components/Effect";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import styles from "./ModMetadataEditor.module.scss";
import { object, string } from "yup";
import {
  isInnerDefinitionRegistryId,
  testIsSemVerString,
} from "@/types/helpers";
import Form, { type RenderBody } from "@/components/form/Form";
import { selectActivatedModComponents } from "@/store/modComponents/modComponentSelectors";
import Alert from "@/components/Alert";
import { createSelector } from "@reduxjs/toolkit";
import { lt } from "semver";
import { useOptionalModDefinition } from "@/modDefinitions/modDefinitionHooks";
import { type ModMetadataFormState } from "@/pageEditor/store/editor/pageEditorTypes";
import { FieldDescriptions } from "@/modDefinitions/modDefinitionConstants";
import IntegrationsSliceModIntegrationsContextAdapter from "@/integrations/store/IntegrationsSliceModIntegrationsContextAdapter";
import cx from "classnames";
import { assertNotNullish } from "@/utils/nullishUtils";
import { type RegistryId } from "@/types/registryTypes";
import { pick } from "lodash";
import AsyncStateGate from "@/components/AsyncStateGate";
import { UI_PATHS } from "@/data/service/urlPaths";

// TODO: This should be yup.SchemaOf<ModMetadataFormState> but we can't set the `id` property to `RegistryId`
// see: https://github.com/jquense/yup/issues/1183#issuecomment-749186432
const editModSchema = object({
  id: string().required(), // Mod id is readonly here
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
  selectActivatedModComponents,
  selectActiveModId,
  (modComponents, activeModId) =>
    modComponents.find((x) => x._recipe?.id === activeModId),
);

const OldModVersionAlert: React.FunctionComponent<{
  modId: RegistryId;
  activatedModVersion: string;
  latestModVersion: string;
}> = ({
  modId,
  activatedModVersion,
  latestModVersion,
}: {
  modId: RegistryId;
  activatedModVersion: string;
  latestModVersion: string;
}) => (
  <Alert variant="warning">
    You are editing version {activatedModVersion} of this mod, the latest
    version is {latestModVersion}. To get the latest version,{" "}
    <a
      href={`/options.html#${UI_PATHS.MOD_ACTIVATE(modId)}`}
      target="_blank"
      title="Re-activate the mod"
      rel="noreferrer"
    >
      re-activate the mod
    </a>
  </Alert>
);

const ModMetadataEditor: React.VoidFunctionComponent = () => {
  const modId = useSelector(selectActiveModId);

  assertNotNullish(modId, "No active mod id");

  const modDefinitionQuery = useOptionalModDefinition(modId);
  const modDefinition = modDefinitionQuery.data;

  // Select a single mod component for the mod to check the activated version.
  // We rely on the assumption that every component in the mod has the same version.
  const modDefinitionComponent = useSelector(selectFirstModComponent);
  // Mod metadata for new mods will only exist on the component form state
  const firstComponentFormStateForMod = useSelector(
    selectFirstModComponentFormStateForActiveMod,
  );

  const activatedModVersion = modDefinitionComponent?._recipe?.version;
  const latestModVersion = modDefinition?.metadata?.version;
  const showOldModVersionWarning =
    activatedModVersion &&
    latestModVersion &&
    lt(activatedModVersion, latestModVersion);

  const dirtyMetadata = useSelector(selectDirtyMetadataForModId(modId));
  // Prefer the metadata from the activated mod component
  const currentMetadata =
    dirtyMetadata ??
    modDefinitionComponent?._recipe ??
    modDefinition?.metadata ??
    firstComponentFormStateForMod?.modMetadata;

  const initialFormState: Partial<ModMetadataFormState> = pick(
    currentMetadata,
    ["id", "name", "version", "description"],
  );

  const dispatch = useDispatch();
  const updateRedux = useCallback(
    (metadata: ModMetadataFormState) => {
      dispatch(actions.editModMetadata(metadata));
    },
    [dispatch],
  );

  const renderBody: RenderBody = ({ values }) => (
    <IntegrationsSliceModIntegrationsContextAdapter>
      <Effect values={values} onChange={updateRedux} delayMillis={100} />

      <Card>
        <Card.Header>Mod Metadata</Card.Header>
        <Card.Body>
          {showOldModVersionWarning && (
            <OldModVersionAlert
              modId={modId}
              activatedModVersion={activatedModVersion}
              latestModVersion={latestModVersion}
            />
          )}
          <div className={styles.modIdField}>
            {isInnerDefinitionRegistryId(
              (values as ModMetadataFormState).id,
            ) ? (
              <Alert variant="info" className={styles.modIdAlert}>
                Save the mod to assign an id
              </Alert>
            ) : (
              <ConnectedFieldTemplate
                name="id"
                label="Mod ID"
                description={FieldDescriptions.MOD_ID}
                readOnly
              />
            )}
          </div>
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
    <Container className={cx(styles.root, "max-750 ml-0")}>
      <AsyncStateGate state={modDefinitionQuery}>
        {() => (
          <ErrorBoundary>
            <Form
              validationSchema={editModSchema}
              initialValues={initialFormState}
              onSubmit={() => {
                console.error(
                  "The form's submit should not be called to save mod metadata. Use 'saveMod' from 'useSaveMod' instead.",
                );
              }}
              renderBody={renderBody}
              renderSubmit={() => null}
            />
          </ErrorBoundary>
        )}
      </AsyncStateGate>
    </Container>
  );
};

export default ModMetadataEditor;
