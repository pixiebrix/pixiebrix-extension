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

import React, { useMemo } from "react";
import { selectScope } from "@/auth/authSelectors";
import { RegistryId, SemVerString } from "@/core";
import { selectExtensions } from "@/store/extensionsSelectors";
import { generateRecipeId } from "@/utils/recipeUtils";
import { Button, Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { selectShowShareContext } from "@/options/pages/blueprints/modals/blueprintModalsSelectors";
import { blueprintModalsSlice } from "@/options/pages/blueprints/modals/blueprintModalsSlice";
import * as Yup from "yup";
import {
  PACKAGE_REGEX,
  testIsSemVerString,
  validateSemVerString,
} from "@/types/helpers";
import { pick } from "lodash";
import Form from "@/components/form/Form";
import { getErrorMessage } from "@/errors/errorHelpers";
import { appApi, useCreateRecipeMutation } from "@/services/api";
import {
  RecipeDefinition,
  selectSourceRecipeMetadata,
} from "@/types/definitions";
import { FormikHelpers } from "formik";
import { makeBlueprint } from "@/options/pages/blueprints/utils/exportBlueprint";
import extensionsSlice from "@/store/extensionsSlice";
import notify from "@/utils/notify";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { FieldDescriptions } from "@/utils/strings";
import RegistryIdWidget from "@/components/form/widgets/RegistryIdWidget";
import { StylesConfig } from "react-select";
import { RequireScope } from "@/auth/RequireScope";
import { isSingleObjectBadRequestError } from "@/types/errorContract";

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

const ConvertToRecipeModal: React.FunctionComponent = () => {
  const dispatch = useDispatch();

  const [createRecipe] = useCreateRecipeMutation();
  const { extensionId } = useSelector(selectShowShareContext);
  const extensions = useSelector(selectExtensions);

  const extension = useMemo(() => {
    if (extensionId == null) {
      return null;
    }

    const extension = extensions.find((x) => x.id === extensionId);
    if (extension == null) {
      throw new Error(`No persisted extension exists with id: ${extensionId}`);
    }

    return extension;
  }, [extensions, extensionId]);

  const scope = useSelector(selectScope);

  const initialValues: ConvertInstallableFormState = {
    blueprintId: generateRecipeId(scope, extension.label),
    name: extension.label,
    version: validateSemVerString("1.0.0"),
    description: "Created with the PixieBrix Page Editor",
  };

  const closeModal = () => {
    dispatch(blueprintModalsSlice.actions.setShareContext(null));
  };

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

      dispatch(
        extensionsSlice.actions.attachExtension({
          extensionId: extension.id,
          recipeMetadata: selectSourceRecipeMetadata(recipe),
        })
      );

      dispatch(appApi.util.invalidateTags(["Recipes"]));

      dispatch(
        blueprintModalsSlice.actions.setShareContext({
          blueprintId: recipe.metadata.id,
        })
      );
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
    <Modal show onHide={closeModal}>
      <Modal.Header closeButton>
        <Modal.Title>Name your blueprint</Modal.Title>
      </Modal.Header>
      <RequireScope scopeSettingsDescription="To share a blueprint, you must first set an account alias for your PixieBrix account">
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
              label="Blueprint ID"
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
    </Modal>
  );
};

export default ConvertToRecipeModal;
