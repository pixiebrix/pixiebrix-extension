/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useEffect, useRef, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { useCreateRecipeMutation, useGetRecipesQuery } from "@/services/api";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { useCreate } from "@/devTools/editor/hooks/useCreate";
import Form, { OnSubmit } from "@/components/form/Form";
import * as yup from "yup";
import { RegistryId, Metadata, PersistedExtension, UUID } from "@/core";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { useFormikContext } from "formik";
import SavingInProgressModal from "./SavingInProgressModal";
import LoadingDataModal from "./LoadingDataModal";
import {
  actions as editorActions,
  editorSlice,
  FormState,
} from "@/devTools/editor/slices/editorSlice";
import { useDispatch, useSelector } from "react-redux";
import useReset from "@/devTools/editor/hooks/useReset";
import { actions as savingExtensionActions } from "@/devTools/editor/panes/save/savingExtensionSlice";
import { actions as optionsActions } from "@/options/slices";
import { selectSavingExtensionId } from "./savingExtensionSelectors";
import { makeBlueprint } from "@/options/pages/installed/exportBlueprint";
import { ADAPTERS } from "../../extensionPoints/adapter";
import { RecipeDefinition } from "@/types/definitions";
import { selectExtensions } from "@/options/selectors";

const updateRecipeSchema: yup.ObjectSchema<Metadata> = yup.object().shape({
  id: yup.string<RegistryId>().required(),
  name: yup.string().required(),
  version: yup.string().required(),
  description: yup.string(),
});

const SAVE_AS_NEW_BLUEPRINT = "Save as New Blueprint";
const UPDATE_BLUEPRINT = "Update Blueprint";

const SaveExtensionWizard: React.FC = () => {
  const dispatch = useDispatch();
  const create = useCreate();
  const { data: recipes, isLoading: areRecipesLoading } = useGetRecipesQuery();
  const [createRecipe] = useCreateRecipeMutation();
  const [isRecipeOptionsModalShown, setRecipeOptionsModalShown] = useState(
    false
  );
  const isNewRecipe = useRef(false);
  const newRecipeInitialValues = useRef<Metadata>(null);
  const {
    values: element,
    setSubmitting,
    setStatus,
  } = useFormikContext<FormState>();
  const reset = useReset();

  const extensions = useSelector(selectExtensions);
  const savingExtensionId = useSelector(selectSavingExtensionId);

  const close = () => {
    dispatch(savingExtensionActions.setWizardOpen(false));
    dispatch(savingExtensionActions.setSavingExtension(null));
    setSubmitting(false);
  };

  const save = (element: FormState) => {
    void create(element, close, setStatus);
  };

  useEffect(() => {
    if (element.recipe || savingExtensionId) {
      return;
    }

    // Extension is not part of a Recipe, save it
    dispatch(savingExtensionActions.setSavingExtension(element.uuid));
    save(element);
  }, [element, create, savingExtensionId]);

  if (!element.recipe || savingExtensionId) {
    return <SavingInProgressModal />;
  }

  if (areRecipesLoading) {
    return <LoadingDataModal onClose={close} />;
  }

  const elementRecipeMeta = element.recipe;
  const recipe = recipes.find((x) => x.metadata.id === elementRecipeMeta.id);

  /**
   * Creating personal extension from the existing one
   * It will not be a part of the Recipe
   */
  const saveAsPersonalExtension = () => {
    const newExtensionUuid = uuidv4();
    dispatch(savingExtensionActions.setSavingExtension(newExtensionUuid));

    const { recipe, ...rest } = element;
    const personalElement: FormState = {
      ...rest,
      uuid: newExtensionUuid,
      recipe: undefined,
    };

    dispatch(editorActions.addElement(personalElement));
    reset({ element, shouldShowConfirmation: false });
    save(personalElement);
  };

  const createNewRecipe = () => {
    isNewRecipe.current = true;
    newRecipeInitialValues.current = {
      // ToDo generate recipe id
      id: "" as RegistryId,
      name: `Copy of ${elementRecipeMeta.name}`,
      version: elementRecipeMeta.version,
      description: elementRecipeMeta.description,
    };

    setRecipeOptionsModalShown(true);
  };

  const updateRecipe = () => {
    isNewRecipe.current = false;
    newRecipeInitialValues.current = elementRecipeMeta;

    setRecipeOptionsModalShown(true);
  };

  const saveRecipeAndExtension: OnSubmit<Metadata> = async (recipeMeta) => {
    dispatch(savingExtensionActions.setSavingExtension(element.uuid));

    if (isNewRecipe.current) {
      const newRecipe: RecipeDefinition = {
        ...recipe,
        metadata: {
          ...recipeMeta,
          // ToDo properly generate id
          id: validateRegistryId(`@balehok/${recipeMeta.id}`),
        },
      };

      await createRecipe({
        recipe: newRecipe,
        organizations: [],
        isPublic: false,
      });

      const recipeExtensions = extensions.filter(
        (x) => x._recipe?.id === recipe.metadata.id
      );

      const adapter = ADAPTERS.get(element.type);
      const extension = adapter.selectExtension(element);

      for (const recipeExtension of recipeExtensions) {
        let update: { id: UUID } & Partial<PersistedExtension>;
        if (recipeExtension.id === extension.id) {
          update = {
            ...extension,
            _recipe: newRecipe.metadata,
          };
        } else {
          update = {
            id: recipeExtension.id,
            _recipe: newRecipe.metadata,
          };
        }

        dispatch(optionsActions.updateExtension(update));
      }

      dispatch(editorSlice.markSaved(element.uuid));
    } else {
      throw new Error("Not implemented yet.");
    }
  };

  const recipeName = elementRecipeMeta.name;
  // ToDo figure the edit permissions
  const isRecipeEditable = true;
  const installedRecipeVersion = elementRecipeMeta.version;
  const latestRecipeVersion = recipe.metadata.version;

  let message: string;
  let showNewRecipeButton = false;
  let showUpdateRecipeButton = false;

  if (isRecipeEditable) {
    if (installedRecipeVersion === latestRecipeVersion) {
      message = `This extension is part of blueprint ${recipeName}, do you want to edit the blueprint, or create a personal extension?`;
      showNewRecipeButton = true;
      showUpdateRecipeButton = true;
    } else {
      message = `This extension is part of blueprint ${recipeName} version ${installedRecipeVersion}, but the latest version is ${latestRecipeVersion}.`;
    }
  } else {
    message = `This extension is part of blueprint ${recipeName}. You do not have permission to edit this blueprint.`;
    showNewRecipeButton = true;
  }

  return isRecipeOptionsModalShown ? (
    <Modal show onHide={close} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>
          {isNewRecipe.current ? SAVE_AS_NEW_BLUEPRINT : UPDATE_BLUEPRINT}
        </Modal.Title>
      </Modal.Header>

      <Form
        validationSchema={updateRecipeSchema}
        initialValues={newRecipeInitialValues.current}
        onSubmit={saveRecipeAndExtension}
        renderSubmit={({ isSubmitting, isValid }) => (
          <Modal.Footer>
            <Button
              variant="link"
              onClick={() => {
                setRecipeOptionsModalShown(false);
              }}
            >
              Back
            </Button>

            <Button variant="info" onClick={close}>
              Cancel
            </Button>

            <Button
              variant="primary"
              type="submit"
              disabled={!isValid || isSubmitting}
            >
              {isNewRecipe.current ? SAVE_AS_NEW_BLUEPRINT : UPDATE_BLUEPRINT}
            </Button>
          </Modal.Footer>
        )}
      >
        <Modal.Body>
          <ConnectedFieldTemplate
            name="id"
            label="ID"
            disabled={!isNewRecipe.current}
          />
          <ConnectedFieldTemplate name="name" label="Name" />
          <ConnectedFieldTemplate name="version" label="Version" />
          <ConnectedFieldTemplate name="description" label="Description" />
        </Modal.Body>
      </Form>
    </Modal>
  ) : (
    <Modal show onHide={close} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Saving extension</Modal.Title>
      </Modal.Header>

      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button variant="info" className="mr-2" onClick={close}>
          Cancel
        </Button>

        <Button
          variant={showNewRecipeButton ? "secondary" : "primary"}
          onClick={saveAsPersonalExtension}
        >
          Save as Personal Extension
        </Button>

        {showNewRecipeButton && (
          <Button
            variant={showUpdateRecipeButton ? "secondary" : "primary"}
            onClick={createNewRecipe}
          >
            {SAVE_AS_NEW_BLUEPRINT}
          </Button>
        )}

        {showUpdateRecipeButton && (
          <Button variant="primary" onClick={updateRecipe}>
            {UPDATE_BLUEPRINT}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default SaveExtensionWizard;
