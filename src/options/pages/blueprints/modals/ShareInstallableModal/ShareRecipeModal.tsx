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
import { UUID } from "@/core";
import { Button, Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { selectShowShareContext } from "@/options/pages/blueprints/modals/blueprintModalsSelectors";
import { blueprintModalsSlice } from "@/options/pages/blueprints/modals/blueprintModalsSlice";
import * as Yup from "yup";
import { sortBy, uniq } from "lodash";
import Form from "@/components/form/Form";
import { getErrorMessage, isAxiosError } from "@/errors";
import {
  appApi,
  useGetEditablePackagesQuery,
  useGetOrganizationsQuery,
  useGetRecipesQuery,
  useUpdateRecipeMutation,
} from "@/services/api";
import { FormikHelpers } from "formik";
import notify from "@/utils/notify";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { getRecipeById } from "@/pageEditor/utils";
import { produce } from "immer";
import SwitchButtonWidget from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";
import FieldTemplate from "@/components/form/FieldTemplate";
import ActivationLink from "./ActivationLink";
import Loader from "@/components/Loader";

type ShareInstallableFormState = {
  public: boolean;
  organizations: UUID[];
};

const validationSchema = Yup.object().shape({
  public: Yup.boolean().required(),
  organizations: Yup.array().of(Yup.string().required()),
});

const ShareRecipeModal: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const { blueprintId } = useSelector(selectShowShareContext);
  const [updateRecipe] = useUpdateRecipeMutation();
  const { data: organizations = [] } = useGetOrganizationsQuery();
  const { data: editablePackages, isFetching: isFetchingEditablePackages } =
    useGetEditablePackagesQuery();
  const { data: recipes, isFetching: isFetchingRecipes } = useGetRecipesQuery();
  const recipe = getRecipeById(recipes, blueprintId);
  const initialValues: ShareInstallableFormState = {
    organizations: recipe?.sharing.organizations ?? [],
    public: recipe?.sharing.public ?? false,
  };

  const closeModal = () => {
    dispatch(blueprintModalsSlice.actions.setShareContext(null));
  };

  const saveSharing = async (
    formValues: ShareInstallableFormState,
    helpers: FormikHelpers<ShareInstallableFormState>
  ) => {
    try {
      const newRecipe = produce(recipe, (draft) => {
        draft.sharing.organizations = formValues.organizations;
        draft.sharing.public = formValues.public;
      });

      const packageId = editablePackages.find(
        (x) => x.name === newRecipe.metadata.id
      )?.id;

      await updateRecipe({
        packageId,
        recipe: newRecipe,
      }).unwrap();

      notify.success("Shared brick");
      closeModal();
      dispatch(appApi.util.invalidateTags(["Recipes"]));
    } catch (error) {
      if (isAxiosError(error) && error.response.data.config) {
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
        <Modal.Title>Share with Teams</Modal.Title>
      </Modal.Header>
      {isFetchingRecipes ? (
        <Modal.Body>
          <Loader />{" "}
        </Modal.Body>
      ) : (
        <Form
          validationSchema={validationSchema}
          initialValues={initialValues}
          onSubmit={saveSharing}
          renderStatus={({ status }) => (
            <div className="text-danger p-3">{status}</div>
          )}
          renderSubmit={() => null}
          renderBody={({ values, setFieldValue, isValid, isSubmitting }) => (
            <>
              <Modal.Body>
                {sortBy(organizations, (organization) => organization.name).map(
                  (organization) => {
                    const checked = values.organizations.includes(
                      organization.id
                    );
                    return (
                      <FieldTemplate
                        key={organization.id}
                        name={organization.id}
                        as={SwitchButtonWidget}
                        label={organization.name}
                        value={checked}
                        onChange={() => {
                          const next = checked
                            ? values.organizations.filter(
                                (x: string) => x !== organization.id
                              )
                            : uniq([...values.organizations, organization.id]);
                          setFieldValue("organizations", next);
                        }}
                      />
                    );
                  }
                )}

                <ConnectedFieldTemplate
                  name="public"
                  as={SwitchButtonWidget}
                  description={
                    // \u00A0 stands for &nbsp;
                    values.public ? (
                      <i>Visible to all PixieBrix users</i>
                    ) : (
                      "\u00A0"
                    )
                  }
                  label={
                    <span>
                      <FontAwesomeIcon icon={faGlobe} /> Public
                    </span>
                  }
                />
              </Modal.Body>
              <Modal.Footer>
                <Button variant="link" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={
                    !isValid || isSubmitting || isFetchingEditablePackages
                  }
                >
                  Save and Close
                </Button>
              </Modal.Footer>
              <Modal.Body>
                <ActivationLink blueprintId={blueprintId} />
              </Modal.Body>
            </>
          )}
        />
      )}
    </Modal>
  );
};

export default ShareRecipeModal;
