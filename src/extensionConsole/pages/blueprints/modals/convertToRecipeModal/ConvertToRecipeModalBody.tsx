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

import React, { useMemo } from "react";
import { selectScope } from "@/auth/authSelectors";
import { selectExtensions } from "@/store/extensionsSelectors";
import { generateRecipeId } from "@/utils/recipeUtils";
import { Button, Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { selectModalsContext } from "@/extensionConsole/pages/blueprints/modals/blueprintModalsSelectors";
import { blueprintModalsSlice } from "@/extensionConsole/pages/blueprints/modals/blueprintModalsSlice";
import * as Yup from "yup";
import {
  PACKAGE_REGEX,
  testIsSemVerString,
  validateSemVerString,
} from "@/types/helpers";
import { pick } from "lodash";
import Form from "@/components/form/Form";
import { getErrorMessage } from "@/errors/errorHelpers";
import {
  useCreateRecipeMutation,
  useDeleteCloudExtensionMutation,
  useGetCloudExtensionsQuery,
} from "@/services/api";
import { type FormikHelpers } from "formik";
import { makeBlueprint } from "@/extensionConsole/pages/blueprints/utils/exportBlueprint";
import extensionsSlice from "@/store/extensionsSlice";
import notify from "@/utils/notify";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { FieldDescriptions } from "@/utils/strings";
import RegistryIdWidget from "@/components/form/widgets/RegistryIdWidget";
import { type StylesConfig } from "react-select";
import { RequireScope } from "@/auth/RequireScope";
import { isSingleObjectBadRequestError } from "@/errors/networkErrorHelpers";
import { useAllRecipes } from "@/recipes/recipesHooks";
import { type RegistryId, type SemVerString } from "@/types/registryTypes";
import { type RecipeDefinition } from "@/types/recipeTypes";
import { selectSourceRecipeMetadata } from "@/types/extensionTypes";

type ConvertInstallableFormState = {
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
      (value: string) => testIsSemVerString(value, { allowLeadingV: false })
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

const ConvertToRecipeModalBody: React.FunctionComponent = () => {
  const dispatch = useDispatch();

  const [createRecipe] = useCreateRecipeMutation();
  const { showShareContext, showPublishContext } =
    useSelector(selectModalsContext);
  const extensionId =
    showShareContext?.extensionId ?? showPublishContext?.extensionId;
  const extensions = useSelector(selectExtensions);
  const { data: cloudExtensions } = useGetCloudExtensionsQuery();
  const [deleteCloudExtension] = useDeleteCloudExtensionMutation();

  const extension = useMemo(() => {
    if (extensionId == null) {
      return null;
    }

    const extension =
      extensions.find((x) => x.id === extensionId) ??
      cloudExtensions?.find((x) => x.id === extensionId);
    if (extension == null) {
      throw new Error(`No persisted extension exists with id: ${extensionId}`);
    }

    return extension;
  }, [extensions, extensionId]);

  const scope = useSelector(selectScope);

  const initialValues: ConvertInstallableFormState = useMemo(
    () => ({
      blueprintId: generateRecipeId(scope, extension.label),
      name: extension.label,
      version: validateSemVerString("1.0.0"),
      description: "Created with the PixieBrix Page Editor",
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial values for the form, we calculate them once
    []
  );

  const closeModal = () => {
    dispatch(blueprintModalsSlice.actions.closeModal());
  };

  const { refetch: refetchRecipes } = useAllRecipes();

  const convertToRecipe = async (
    formValues: ConvertInstallableFormState,
    helpers: FormikHelpers<ConvertInstallableFormState>
  ) => {
    try {
      const unsavedRecipe = makeBlueprint(extension, {
        id: formValues.blueprintId,
        name: formValues.name,
        description: formValues.description,
        version: formValues.version,
      });

      const response = await createRecipe({
        recipe: unsavedRecipe,
        organizations: [],
        public: false,
        shareDependencies: true,
      }).unwrap();

      const recipe: RecipeDefinition = {
        ...unsavedRecipe,
        sharing: pick(response, ["public", "organizations"]),
        ...pick(response, ["updated_at"]),
      };

      // Cloud extension doesn't have "active" property
      if ("active" in extension && extension.active) {
        // Dealing with installed extension
        dispatch(
          extensionsSlice.actions.attachExtension({
            extensionId: extension.id,
            recipeMetadata: selectSourceRecipeMetadata(recipe),
          })
        );
      } else {
        // In case of cloud extension, we need to delete it
        // Since it's now a part of the blueprint
        await deleteCloudExtension({
          extensionId: extension.id,
        }).unwrap();
      }

      refetchRecipes();

      if (showPublishContext == null) {
        dispatch(
          blueprintModalsSlice.actions.setShareContext({
            blueprintId: recipe.metadata.id,
          })
        );
      } else {
        dispatch(
          blueprintModalsSlice.actions.setPublishContext({
            blueprintId: recipe.metadata.id,
          })
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
        onSubmit={convertToRecipe}
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
            description={FieldDescriptions.BLUEPRINT_ID}
            as={RegistryIdWidget}
            selectStyles={selectStylesOverride}
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
        </Modal.Body>
      </Form>
    </RequireScope>
  );
};

export default ConvertToRecipeModalBody;
