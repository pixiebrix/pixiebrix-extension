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

import React from "react";
import { Button, Modal } from "react-bootstrap";
import { PACKAGE_REGEX } from "@/types/helpers";
import Form, { OnSubmit } from "@/components/form/Form";
import * as yup from "yup";
import { RegistryId } from "@/core";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { RequireScope } from "@/auth/RequireScope";

export type RecipeConfiguration = {
  id: RegistryId;
  name: string;
  version?: string;
  description?: string;
};

// TODO: This should be yup.SchemaOf<RecipeConfiguration> but we can't set the `id` property to `RegistryId`
const recipeConfigurationSchema = yup.object().shape({
  id: yup.string().matches(PACKAGE_REGEX, "Invalid registry id").required(),
  name: yup.string().required(),
  version: yup.string().required(),
  description: yup.string(),
});

const SAVE_AS_NEW_BLUEPRINT = "Save as New Blueprint";
const UPDATE_BLUEPRINT = "Update Blueprint";

type OwnProps = {
  initialValues: RecipeConfiguration;
  isNewRecipe: boolean;
  close: () => void;
  navigateBack: () => void;
  save: OnSubmit<RecipeConfiguration>;
};

const RecipeConfigurationModal: React.FC<OwnProps> = ({
  initialValues,
  isNewRecipe,
  close,
  navigateBack,
  save,
}) => (
  <Modal show onHide={close} backdrop="static" keyboard={false}>
    <Modal.Header closeButton>
      <Modal.Title>
        {isNewRecipe ? SAVE_AS_NEW_BLUEPRINT : UPDATE_BLUEPRINT}
      </Modal.Title>
    </Modal.Header>

    <RequireScope
      require={isNewRecipe}
      scopeSettingsDescription="To create a new blueprint, you must first set an account alias for your PixieBrix account"
    >
      <Form
        validationSchema={recipeConfigurationSchema}
        initialValues={initialValues}
        onSubmit={save}
        renderSubmit={({ isSubmitting, isValid }) => (
          <Modal.Footer>
            <Button variant="link" onClick={navigateBack}>
              Back
            </Button>

            <Button
              variant="info"
              onClick={() => {
                close();
              }}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              type="submit"
              disabled={!isValid || isSubmitting}
            >
              {isNewRecipe ? SAVE_AS_NEW_BLUEPRINT : UPDATE_BLUEPRINT}
            </Button>
          </Modal.Footer>
        )}
      >
        <Modal.Body>
          <ConnectedFieldTemplate
            name="id"
            label="ID"
            disabled={!isNewRecipe}
          />
          <ConnectedFieldTemplate name="name" label="Name" />
          <ConnectedFieldTemplate name="version" label="Version" />
          <ConnectedFieldTemplate name="description" label="Description" />
        </Modal.Body>
      </Form>
    </RequireScope>
  </Modal>
);

export default RecipeConfigurationModal;
