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
  selectActiveRecipeId,
  selectDeletedElements,
  selectDirty,
  selectDirtyRecipeOptions,
  selectElements,
  selectKeepLocalCopyOnCreateRecipe,
  selectNewRecipeIds,
} from "@/pageEditor/slices/editorSelectors";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { Button, Modal } from "react-bootstrap";
import { RecipeDefinition, RecipeMetadataFormState } from "@/types/definitions";
import { selectScope } from "@/auth/authSelectors";
import {
  buildRecipe,
  generateRecipeId,
  generateScopeBrickId,
} from "@/pageEditor/panes/save/saveHelpers";
import { RequireScope } from "@/auth/RequireScope";
import Form, {
  OnSubmit,
  RenderBody,
  RenderSubmit,
} from "@/components/form/Form";
import { useCreateRecipeMutation, useGetRecipesQuery } from "@/services/api";
import useCreate from "@/pageEditor/hooks/useCreate";
import extensionsSlice from "@/store/extensionsSlice";
import { isAxiosError } from "@/errors";
import notify from "@/utils/notify";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { produce } from "immer";
import { selectRecipeMetadata } from "@/pageEditor/panes/save/useSavingWizard";
import { FieldDescriptions } from "@/utils/strings";
import { object, string } from "yup";
import LoadingDataModal from "@/pageEditor/panes/save/LoadingDataModal";
import { FormState } from "@/pageEditor/pageEditorTypes";
import { selectExtensions } from "@/store/extensionsSelectors";

const { actions: optionsActions } = extensionsSlice;

function useSaveCallbacks({ activeElement }: { activeElement: FormState }) {
  const dispatch = useDispatch();

  const editorFormElements = useSelector(selectElements);
  const isDirtyByElementId = useSelector(selectDirty);
  const installedExtensions = useSelector(selectExtensions);
  const dirtyRecipeOptions = useSelector(selectDirtyRecipeOptions);
  const deletedElementsByRecipeId = useSelector(selectDeletedElements);
  const [createRecipe] = useCreateRecipeMutation();
  const create = useCreate();
  const keepLocalCopy = useSelector(selectKeepLocalCopyOnCreateRecipe);

  const createRecipeFromElement = useCallback(
    async (element: FormState, metadata: RecipeMetadataFormState) => {
      let recipeElement = produce(activeElement, (draft) => {
        draft.uuid = uuidv4();
      });
      const newRecipe = buildRecipe({
        cleanRecipeExtensions: [],
        dirtyRecipeElements: [recipeElement],
        metadata,
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
    },
    [activeElement, create, createRecipe, dispatch, keepLocalCopy]
  );

  const createRecipeFromRecipe = useCallback(
    async (recipe: RecipeDefinition, metadata: RecipeMetadataFormState) => {
      const recipeId = recipe.metadata.id;
      // eslint-disable-next-line security/detect-object-injection -- recipeId
      const deletedElements = deletedElementsByRecipeId[recipeId] ?? [];
      const deletedElementIds = new Set(
        deletedElements.map(({ uuid }) => uuid)
      );

      const dirtyRecipeElements = editorFormElements.filter(
        (element) =>
          element.recipe?.id === recipeId &&
          isDirtyByElementId[element.uuid] &&
          !deletedElementIds.has(element.uuid)
      );
      const cleanRecipeExtensions = installedExtensions.filter(
        (extension) =>
          extension._recipe?.id === recipeId &&
          !dirtyRecipeElements.some(
            (element) => element.uuid === extension.id
          ) &&
          !deletedElementIds.has(extension.id)
      );
      // eslint-disable-next-line security/detect-object-injection -- new recipe IDs are sanitized in the form validation
      const options = dirtyRecipeOptions[recipeId];

      const newRecipe = buildRecipe({
        sourceRecipe: recipe,
        cleanRecipeExtensions,
        dirtyRecipeElements,
        options,
        metadata,
      });

      // Currently, user cannot share from the Page Editor, so just pass unshared options
      const response = await createRecipe({
        recipe: newRecipe,
        organizations: [],
        public: false,
      }).unwrap();

      // Uninstall the previous recipe's extensions
      for (const { id: extensionId } of installedExtensions.filter(
        (extension) => extension._recipe?.id === recipeId
      )) {
        dispatch(optionsActions.removeExtension({ extensionId }));
      }

      // Install the new recipe
      const savedRecipe: RecipeDefinition = {
        ...newRecipe,
        sharing: {
          public: response.public,
          organizations: response.organizations,
        },
        updated_at: response.updated_at,
      };
      dispatch(
        optionsActions.installRecipe({
          recipe: savedRecipe,
          services: {},
          extensionPoints: savedRecipe.extensionPoints,
        })
      );

      dispatch(
        editorActions.finishSaveAsNewRecipe({
          oldRecipeId: recipeId,
          newRecipeId: savedRecipe.metadata.id,
          metadata,
          options,
        })
      );
    },
    [
      createRecipe,
      deletedElementsByRecipeId,
      dirtyRecipeOptions,
      dispatch,
      editorFormElements,
      installedExtensions,
      isDirtyByElementId,
    ]
  );

  return {
    createRecipeFromElement,
    createRecipeFromRecipe,
  };
}

function useInitialFormState({
  activeRecipe,
  activeElement,
}: {
  activeElement: FormState;
  activeRecipe: RecipeDefinition | null;
}) {
  const scope = useSelector(selectScope);

  let initialFormState: RecipeMetadataFormState;

  if (activeRecipe) {
    // Handle the "Save As New" case, where an existing recipe is selected
    initialFormState = {
      id: generateScopeBrickId(scope, activeRecipe.metadata.id),
      name: activeRecipe.metadata.name,
      version: "1.0.0",
      description: activeRecipe.metadata.description,
    };
  } else if (activeElement) {
    // Handle creating a new blueprint from a selected extension
    initialFormState = {
      id: generateRecipeId(scope, activeElement.label),
      name: activeElement.label,
      version: "1.0.0",
      description: "Created with the PixieBrix Page Editor",
    };
  } else {
    // XXX: The render loop contains useGetRecipesQuery. So, there's a state where activeRecipe won't be set yet even
    // if there is a recipe selected. To simplify this in the future, we may want to wrap the core logic behind a
    // loader to avoid handling intermediate loading states.
    initialFormState = null;
  }

  return initialFormState;
}

function useFormSchema() {
  const newRecipeIds = useSelector(selectNewRecipeIds);

  // TODO: This should be yup.SchemaOf<RecipeMetadataFormState> but we can't set the `id` property to `RegistryId`
  // see: https://github.com/jquense/yup/issues/1183#issuecomment-749186432
  return object({
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
}

const CreateRecipeModal: React.VFC = () => {
  const dispatch = useDispatch();

  const activeElement = useSelector(selectActiveElement);

  const activeRecipeId = useSelector(selectActiveRecipeId);
  const { data: recipes, isLoading: isRecipesLoading } = useGetRecipesQuery();
  const activeRecipe = recipes.find(
    (recipe) => recipe.metadata.id === activeRecipeId
  );

  const formSchema = useFormSchema();

  const hideModal = useCallback(() => {
    dispatch(editorActions.hideCreateRecipeModal());
  }, [dispatch]);

  const initialFormState = useInitialFormState({ activeElement, activeRecipe });
  const { createRecipeFromElement, createRecipeFromRecipe } = useSaveCallbacks({
    activeElement,
  });

  const onSubmit = useCallback<OnSubmit<RecipeMetadataFormState>>(
    async (values, helpers) => {
      try {
        if (activeElement) {
          await createRecipeFromElement(activeElement, values);
        } else if (activeRecipe) {
          await createRecipeFromRecipe(activeRecipe, values);
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
    [
      activeElement,
      activeRecipe,
      createRecipeFromElement,
      createRecipeFromRecipe,
      hideModal,
    ]
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

  if (activeRecipeId && isRecipesLoading) {
    return <LoadingDataModal onClose={hideModal} />;
  }

  return (
    <Modal show onHide={hideModal}>
      <Modal.Header closeButton>
        <Modal.Title>Create new blueprint</Modal.Title>
      </Modal.Header>
      <RequireScope scopeSettingsDescription="To create a blueprint, you must first set an account alias for your PixieBrix account">
        <Form
          validationSchema={formSchema}
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
