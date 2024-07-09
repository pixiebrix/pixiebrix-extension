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

import React, { useMemo } from "react";
import { selectScope } from "@/auth/authSelectors";
import { selectActivatedModComponents } from "@/store/extensionsSelectors";
import { Button, Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { selectModalsContext } from "@/extensionConsole/pages/mods/modals/modModalsSelectors";
import { modModalsSlice } from "@/extensionConsole/pages/mods/modals/modModalsSlice";
import * as Yup from "yup";
import {
  PACKAGE_REGEX,
  testIsSemVerString,
  normalizeSemVerString,
} from "@/types/helpers";
import { pick } from "lodash";
import Form from "@/components/form/Form";
import { getErrorMessage } from "@/errors/errorHelpers";
import {
  useCreateModDefinitionMutation,
  useDeleteStandaloneModDefinitionMutation,
  useGetAllStandaloneModDefinitionsQuery,
} from "@/data/service/api";
import { type FormikHelpers } from "formik";
import mapModComponentToModDefinition from "@/extensionConsole/pages/mods/utils/mapModComponentToModDefinition";
import extensionsSlice from "@/store/extensionsSlice";
import notify from "@/utils/notify";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import RegistryIdWidget from "@/components/form/widgets/RegistryIdWidget";
import { type StylesConfig } from "react-select";
import { RequireScope } from "@/auth/RequireScope";
import { isSingleObjectBadRequestError } from "@/errors/networkErrorHelpers";
import { useAllModDefinitions } from "@/modDefinitions/modDefinitionHooks";
import { type RegistryId, type SemVerString } from "@/types/registryTypes";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { generatePackageId } from "@/utils/registryUtils";
import { FieldDescriptions } from "@/modDefinitions/modDefinitionConstants";

import { pickModDefinitionMetadata } from "@/modDefinitions/util/pickModDefinitionMetadata";

type ConvertModFormState = {
  blueprintId: RegistryId;
  name: string;
  version: SemVerString;
  description: string;
};

const validationSchema = Yup.object().shape({
  blueprintId: Yup.string()
    .matches(PACKAGE_REGEX, "Invalid registry id")
    .required(),
  name: Yup.string().required(),
  version: Yup.string()
    .test(
      "semver",
      "Version must follow the X.Y.Z semantic version format, without a leading 'v'",
      (value: string) => testIsSemVerString(value, { allowLeadingV: false }),
    )
    .required(),
  description: Yup.string().required(),
});

const selectStylesOverride: StylesConfig = {
  control: (base) => ({
    ...base,
    borderRadius: 0,
    border: "none",
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0.875rem 1.375rem",
  }),
  singleValue: (base) => ({
    ...base,
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
  }),
  input: (base) => ({
    ...base,
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
  }),
};

const ConvertToModModalBody: React.FunctionComponent = () => {
  const dispatch = useDispatch();

  const [createMod] = useCreateModDefinitionMutation();
  const { showShareContext, showPublishContext } =
    useSelector(selectModalsContext);
  const modComponentId =
    showShareContext?.extensionId ?? showPublishContext?.extensionId;
  const activatedModComponents = useSelector(selectActivatedModComponents);
  const { data: standaloneModDefinitions } =
    useGetAllStandaloneModDefinitionsQuery();
  const [deleteStandaloneModDefinition] =
    useDeleteStandaloneModDefinitionMutation();

  const modComponent = useMemo(() => {
    if (modComponentId == null) {
      return null;
    }

    const modComponent =
      activatedModComponents.find((x) => x.id === modComponentId) ??
      standaloneModDefinitions?.find((x) => x.id === modComponentId);
    if (modComponent == null) {
      throw new Error(
        `No persisted extension exists with id: ${modComponentId}`,
      );
    }

    return modComponent;
  }, [standaloneModDefinitions, activatedModComponents, modComponentId]);

  const scope = useSelector(selectScope);

  const initialValues: ConvertModFormState = useMemo(
    () => ({
      blueprintId: generatePackageId(scope, modComponent.label),
      name: modComponent.label,
      version: normalizeSemVerString("1.0.0"),
      description: "Created with the PixieBrix Page Editor",
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial values for the form, we calculate them once
    [],
  );

  const closeModal = () => {
    dispatch(modModalsSlice.actions.closeModal());
  };

  const { refetch: refetchModDefinitions } = useAllModDefinitions();

  const convertToMod = async (
    formValues: ConvertModFormState,
    helpers: FormikHelpers<ConvertModFormState>,
  ) => {
    try {
      const unsavedModDefinition = mapModComponentToModDefinition(
        modComponent,
        {
          id: formValues.blueprintId,
          name: formValues.name,
          description: formValues.description,
          version: formValues.version,
        },
      );

      const response = await createMod({
        modDefinition: unsavedModDefinition,
        organizations: [],
        public: false,
        shareDependencies: true,
      }).unwrap();

      const modDefinition: ModDefinition = {
        ...unsavedModDefinition,
        sharing: pick(response, ["public", "organizations"]),
        ...pick(response, ["updated_at"]),
      };

      // Cloud extension doesn't have "active" property
      if ("active" in modComponent && modComponent.active) {
        // Dealing with installed extension
        dispatch(
          extensionsSlice.actions.setModComponentMetadata({
            modComponentId: modComponent.id,
            modMetadata: pickModDefinitionMetadata(modDefinition),
          }),
        );
      } else {
        // In case of cloud extension, we need to delete it
        // Since it's now a part of the blueprint
        await deleteStandaloneModDefinition({
          extensionId: modComponent.id,
        }).unwrap();
      }

      refetchModDefinitions();

      if (showPublishContext == null) {
        dispatch(
          modModalsSlice.actions.setShareContext({
            blueprintId: modDefinition.metadata.id,
          }),
        );
      } else {
        dispatch(
          modModalsSlice.actions.setPublishContext({
            blueprintId: modDefinition.metadata.id,
          }),
        );
      }
    } catch (error) {
      if (isSingleObjectBadRequestError(error) && error.response.data.config) {
        helpers.setStatus(error.response.data.config);
        return;
      }

      const message = getErrorMessage(error);
      helpers.setStatus(message);

      notify.error({
        message,
        error,
      });
    } finally {
      helpers.setSubmitting(false);
    }
  };

  return (
    <RequireScope scopeSettingsDescription="To share a mod, you must first set an account alias for your PixieBrix account">
      <Form
        validationSchema={validationSchema}
        initialValues={initialValues}
        onSubmit={convertToMod}
        renderStatus={({ status }) => (
          <div className="text-danger p-3">{status}</div>
        )}
        renderSubmit={({ isSubmitting, isValid }) => (
          <Modal.Footer>
            <Button variant="link" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!isValid || isSubmitting}
            >
              Save and Continue
            </Button>
          </Modal.Footer>
        )}
      >
        <Modal.Body>
          <ConnectedFieldTemplate
            name="blueprintId"
            label="Mod ID"
            description={FieldDescriptions.MOD_ID}
            as={RegistryIdWidget}
            selectStyles={selectStylesOverride}
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
        </Modal.Body>
      </Form>
    </RequireScope>
  );
};

export default ConvertToModModalBody;
