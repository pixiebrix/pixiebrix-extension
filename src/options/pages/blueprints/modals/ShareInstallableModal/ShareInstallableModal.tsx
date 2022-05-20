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

import { selectScope } from "@/auth/authSelectors";
import { RegistryId, SemVerString, UnresolvedExtension, UUID } from "@/core";
import { selectExtensions } from "@/store/extensionsSelectors";
import { generateRecipeId } from "@/utils/recipeUtils";
import { FormikWizard, Step } from "formik-wizard-form";
import React, { useCallback, useMemo } from "react";
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
import { isEmpty, pick } from "lodash";
import { OnSubmit } from "@/components/form/Form";
import { isAxiosError } from "@/errors";
import {
  appApi,
  useCreateRecipeMutation,
  useGetEditablePackagesQuery,
  useGetRecipesQuery,
  useUpdateRecipeMutation,
} from "@/services/api";
import {
  RecipeDefinition,
  selectSourceRecipeMetadata,
} from "@/types/definitions";
import { FormikHelpers } from "formik";
import { makeBlueprint } from "@/options/pages/blueprints/utils/exportBlueprint";
import extensionsSlice from "@/store/extensionsSlice";
import notify from "@/utils/notify";
import ConvertToRecipe from "./ConvertToRecipe";
import ShareRecipe from "./ShareRecipe";
import { getRecipeById } from "@/pageEditor/utils";
import { produce } from "immer";

// TODO:
// 1. Check unique BP id
// 2. Throw? when extensionId in convert modal is not defined
// 3. Delete old modals

type ShareInstallableFormState = {
  blueprintId: RegistryId;
  name: string;
  version: SemVerString;
  description: string;
  public: boolean;
  organizations: UUID[];
};

const stepConvertToRecipe = {
  component: ConvertToRecipe,
  validationSchema: Yup.object().shape({
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
  }),
};

const stepShare = {
  component: ShareRecipe,
  validationSchema: Yup.object().shape({
    public: Yup.boolean().required(),
    organizations: Yup.array().of(Yup.string().required()),
  }),
};

async function convertAndShare(
  extension: UnresolvedExtension,
  form: ShareInstallableFormState,
  createRecipe: any
): Promise<RecipeDefinition> {
  // TODO Which one to use: exportBlueprint.makeBlueprint vs saveHelpers.buildRecipe
  const blueprint = makeBlueprint(extension, {
    id: form.blueprintId,
    name: form.name,
    description: form.description,
    version: form.version,
  });

  const response = await createRecipe({
    recipe: blueprint,
    organizations: form.organizations,
    public: form.public,
    shareDependencies: true,
  }).unwrap();

  return {
    ...blueprint,
    sharing: pick(response, ["public", "organizations"]),
    ...pick(response, ["updated_at"]),
  };
}

const ShareInstallableModal: React.FunctionComponent = () => {
  const dispatch = useDispatch();

  const { extensionId, blueprintId } = useSelector(selectShowShareContext);

  const { data: recipes } = useGetRecipesQuery();
  const extensions = useSelector(selectExtensions);
  const { data: editablePackages } = useGetEditablePackagesQuery();
  const [createRecipe] = useCreateRecipeMutation();
  const [updateRecipe] = useUpdateRecipeMutation();

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

  let initialValues: ShareInstallableFormState;
  if (blueprintId == null) {
    initialValues = {
      blueprintId: generateRecipeId(scope, extension.label),
      name: extension.label,
      version: validateSemVerString("1.0.0"),
      description: "Created with the PixieBrix Page Editor",
      organizations: [],
      public: false,
    };
  } else {
    const recipe = getRecipeById(recipes, blueprintId);
    initialValues = {
      blueprintId: recipe.metadata.id,
      name: recipe.metadata.name,
      version: recipe.metadata.version,
      description: recipe.metadata.description,
      organizations: recipe.sharing.organizations,
      public: recipe.sharing.public,
    };
  }

  const onCancel = () => {
    dispatch(blueprintModalsSlice.actions.setShareContext(null));
  };

  const onShare: OnSubmit = useCallback(
    async (
      values: ShareInstallableFormState,
      helpers: FormikHelpers<ShareInstallableFormState>
    ) => {
      if (blueprintId == null) {
        try {
          const recipe: RecipeDefinition = await convertAndShare(
            extension,
            values,
            createRecipe
          );
          dispatch(
            extensionsSlice.actions.attachExtension({
              extensionId: extension.id,
              recipeMetadata: selectSourceRecipeMetadata(recipe),
            })
          );
          notify.success("Converted/shared brick");

          onCancel();

          dispatch(appApi.util.invalidateTags(["Recipes"]));
        } catch (error) {
          if (isAxiosError(error) && error.response.data.config) {
            helpers.setStatus(error.response.data.config);
            return;
          }

          notify.error({
            message: "Error converting/sharing brick",
            error,
          });
        } finally {
          helpers.setSubmitting(false);
        }
      } else {
        const recipe = getRecipeById(recipes, blueprintId);
        const newRecipe = produce(recipe, (draft) => {
          draft.sharing.organizations = values.organizations;
          draft.sharing.public = values.public;
        });
        const packageId = editablePackages.find(
          (x) => x.name === newRecipe.metadata.id
        )?.id;
        const response = await updateRecipe({
          packageId,
          recipe: newRecipe,
        }).unwrap();

        notify.success("Shared brick");
        onCancel();
        dispatch(appApi.util.invalidateTags(["Recipes"]));
      }
    },
    [dispatch, extension]
  );

  const steps: Step[] = [stepShare];
  if (blueprintId == null) {
    steps.unshift(stepConvertToRecipe);
  }

  return (
    <FormikWizard
      initialValues={initialValues}
      onSubmit={onShare}
      validateOnNext
      activeStepIndex={0}
      steps={steps}
    >
      {({
        renderComponent,
        handleNext,
        isNextDisabled,
        isLastStep,
        values,
      }) => (
        <Modal show onHide={onCancel}>
          <Modal.Header>
            <Modal.Title>Share as Blueprint</Modal.Title>
          </Modal.Header>
          <Modal.Body>{renderComponent()}</Modal.Body>
          <Modal.Footer>
            <Button variant="link" onClick={onCancel}>
              Cancel
            </Button>
            <Button disabled={isNextDisabled} onClick={handleNext}>
              {isLastStep
                ? values.public || !isEmpty(values.organizations)
                  ? "Share"
                  : "Convert"
                : "Next"}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </FormikWizard>
  );
};

export default ShareInstallableModal;
