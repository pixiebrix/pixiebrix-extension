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
import Form, { OnSubmit } from "@/components/form/Form";
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
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { FieldDescriptions } from "@/utils/strings";
import RegistryIdWidget from "@/components/form/widgets/RegistryIdWidget";

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

const ConvertToRecipeModal: React.FunctionComponent = () => {
  const dispatch = useDispatch();

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

  const convertToRecipe = () => {
    console.log("Not implemented");
  };

  return (
    <Modal show onHide={closeModal}>
      <Modal.Header>
        <Modal.Title>Name your blueprint</Modal.Title>
      </Modal.Header>
      <Form
        validationSchema={validationSchema}
        initialValues={initialValues}
        onSubmit={convertToRecipe}
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
            name="id"
            label="Blueprint ID"
            description={FieldDescriptions.BLUEPRINT_ID}
            widerLabel
            as={RegistryIdWidget}
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
      </Form>
    </Modal>
  );
};

export default ConvertToRecipeModal;
