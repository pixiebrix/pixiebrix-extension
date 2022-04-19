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
import { PACKAGE_REGEX, uuidv4, validateSemVerString } from "@/types/helpers";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveElement,
  selectKeepLocalCopyOnCreateRecipe,
  selectNewRecipeIds,
} from "@/pageEditor/slices/editorSelectors";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { Button, Modal } from "react-bootstrap";
import { RecipeMetadataFormState } from "@/types/definitions";
import { selectScope } from "@/auth/authSelectors";
import {
  buildRecipe,
  generateRecipeId,
} from "@/pageEditor/panes/save/saveHelpers";
import { RequireScope } from "@/auth/RequireScope";
import Form, {
  OnSubmit,
  RenderBody,
  RenderSubmit,
} from "@/components/form/Form";
import { useCreateRecipeMutation } from "@/services/api";
import useCreate from "@/pageEditor/hooks/useCreate";
import extensionsSlice from "@/store/extensionsSlice";
import { isAxiosError } from "@/errors";
import notify from "@/utils/notify";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { produce } from "immer";
import { selectRecipeMetadata } from "@/pageEditor/panes/save/useSavingWizard";
import { FieldDescriptions } from "@/utils/strings";
import { object, string } from "yup";

const { actions: optionsActions } = extensionsSlice;

const CreateRecipeModal: React.VFC = () => {
  const newRecipeIds = useSelector(selectNewRecipeIds);
  const activeElement = useSelector(selectActiveElement);
  const scope = useSelector(selectScope);
  const [createRecipe] = useCreateRecipeMutation();
  const create = useCreate();
  const keepLocalCopy = useSelector(selectKeepLocalCopyOnCreateRecipe);

  // TODO: This should be yup.SchemaOf<RecipeMetadataFormState> but we can't set the `id` property to `RegistryId`
  // see: https://github.com/jquense/yup/issues/1183#issuecomment-749186432
  const createRecipeSchema = object({
    id: string()
      .matches(PACKAGE_REGEX, "Invalid registry id")
      .notOneOf(newRecipeIds, "This id is already in use")
      .required(),
    name: string().required(),
    version: string()
      .test(
        "semver",
        "Version must follow the X.Y.Z semantic version format, without a leading 'v'",
        (value: string) => validateSemVerString(value, false)
      )
      .required(),
    description: string(),
  });

  const dispatch = useDispatch();
  const hideModal = useCallback(() => {
    dispatch(editorActions.hideCreateRecipeModal());
  }, [dispatch]);

  const initialFormState: RecipeMetadataFormState = {
    id: generateRecipeId(scope, activeElement.label),
    name: activeElement.label,
    version: "1.0.0",
    description: "Created with the PixieBrix Page Editor",
  };

  const onSubmit = useCallback<OnSubmit<RecipeMetadataFormState>>(
    async (values, helpers) => {
      try {
        let recipeElement = produce(activeElement, (draft) => {
          draft.uuid = uuidv4();
        });
        const newRecipe = buildRecipe({
          cleanRecipeExtensions: [],
          dirtyRecipeElements: [recipeElement],
          metadata: values,
        });
        const response = await createRecipe({
          recipe: newRecipe,
          organizations: [],
          public: false,
        }).unwrap();
        recipeElement = produce(recipeElement, (draft) => {
          draft.recipe = selectRecipeMetadata(newRecipe, response);
        });
        dispatch(editorActions.addElement(recipeElement));
        // Don't push to cloud since we're saving it with the recipe
        await create({ element: recipeElement, pushToCloud: false });
        if (!keepLocalCopy) {
          dispatch(editorActions.removeElement(activeElement.uuid));
          dispatch(
            optionsActions.removeExtension({ extensionId: activeElement.uuid })
          );
        }

        hideModal();
      } catch (error) {
        if (isAxiosError(error) && error.response.data.config) {
          helpers.setStatus(error.response.data.config);
          return;
        }

        notify.error({
          message: "Error creating blueprint",
          error,
        });
      } finally {
        helpers.setSubmitting(false);
      }
    },
    [activeElement, create, createRecipe, dispatch, hideModal, keepLocalCopy]
  );

  const renderBody: RenderBody = () => (
    <Modal.Body>
      <ConnectedFieldTemplate
        name="id"
        label="Blueprint ID"
        description={FieldDescriptions.BLUEPRINT_ID}
        widerLabel
      />
      <ConnectedFieldTemplate
        name="name"
        label="Name"
        widerLabel
        description={FieldDescriptions.BLUEPRINT_NAME}
      />
      <ConnectedFieldTemplate
        name="version"
        label="Version"
        widerLabel
        description={FieldDescriptions.BLUEPRINT_VERSION}
      />
      <ConnectedFieldTemplate
        name="description"
        label="Description"
        widerLabel
        description={FieldDescriptions.BLUEPRINT_DESCRIPTION}
      />
    </Modal.Body>
  );

  const renderSubmit: RenderSubmit = ({ isSubmitting, isValid }) => (
    <Modal.Footer>
      <Button variant="info" onClick={hideModal}>
        Cancel
      </Button>
      <Button
        variant="primary"
        type="submit"
        disabled={!isValid || isSubmitting}
      >
        Create
      </Button>
    </Modal.Footer>
  );

  return (
    <Modal show onHide={hideModal}>
      <Modal.Header closeButton>
        <Modal.Title>Create new blueprint</Modal.Title>
      </Modal.Header>
      <RequireScope scopeSettingsDescription="To create a blueprint, you must first set an account alias for your PixieBrix account">
        <Form
          validationSchema={createRecipeSchema}
          initialValues={initialFormState}
          onSubmit={onSubmit}
          renderBody={renderBody}
          renderSubmit={renderSubmit}
        />
      </RequireScope>
    </Modal>
  );
};

export default CreateRecipeModal;
