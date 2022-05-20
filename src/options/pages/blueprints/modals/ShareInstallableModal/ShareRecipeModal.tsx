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

import React, { ReactElement } from "react";
import { UUID } from "@/core";
import { Button, Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { selectShowShareContext } from "@/options/pages/blueprints/modals/blueprintModalsSelectors";
import { blueprintModalsSlice } from "@/options/pages/blueprints/modals/blueprintModalsSlice";
import * as Yup from "yup";
import { sortBy } from "lodash";
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
import { getRecipeById, getScopeAndId } from "@/utils";
import { produce } from "immer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGlobe,
  faTimes,
  faUser,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import ActivationLink from "./ActivationLink";
import Loader from "@/components/Loader";
import { RequireScope } from "@/auth/RequireScope";
import ReactSelect from "react-select";
import cx from "classnames";
import styles from "./ShareRecipeModal.module.scss";
import BootstrapSwitchButton from "bootstrap-switch-button-react";
import { selectAuth } from "@/auth/authSelectors";
import { Organization } from "@/types/contract";

type ShareInstallableFormState = {
  public: boolean;
  organizations: UUID[];
};

const validationSchema = Yup.object().shape({
  public: Yup.boolean().required(),
  organizations: Yup.array().of(Yup.string().required()),
});

const sortOrganizations = (organizations: Organization[]) =>
  sortBy(organizations, (organization) => organization.name);

const ShareRecipeModal: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const { blueprintId } = useSelector(selectShowShareContext);
  const { scope: userScope } = useSelector(selectAuth);
  const [updateRecipe] = useUpdateRecipeMutation();
  const { data: organizations = [] } = useGetOrganizationsQuery();
  const { data: editablePackages, isFetching: isFetchingEditablePackages } =
    useGetEditablePackagesQuery();
  const { data: recipes, isFetching: isFetchingRecipes } = useGetRecipesQuery();
  const recipe = getRecipeById(recipes, blueprintId);

  const closeModal = () => {
    dispatch(blueprintModalsSlice.actions.setShareContext(null));
  };

  // If the was just converted to a blueprint, the API request is likely be in progress and recipe will be null
  if (isFetchingRecipes) {
    return (
      <Modal show onHide={closeModal}>
        <Modal.Header closeButton>
          <Modal.Title>Share with Teams</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Loader />
        </Modal.Body>
      </Modal>
    );
  }

  const initialValues: ShareInstallableFormState = {
    organizations: recipe.sharing.organizations,
    public: recipe.sharing.public,
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

  // Sorting returns new array, so it safe to mutate it
  const organizationsForSelect = sortOrganizations(organizations);
  const [recipeScope] = getScopeAndId(recipe?.metadata.id);
  let ownerLabel: ReactElement;
  if (recipeScope === userScope) {
    ownerLabel = (
      <span>
        <FontAwesomeIcon icon={faUser} /> You
      </span>
    );
  } else {
    const ownerOrganizationIndex = organizationsForSelect.findIndex(
      (x) => x.scope === recipeScope
    );

    const ownerOrganization = organizationsForSelect.splice(
      ownerOrganizationIndex,
      1
    )[0];
    ownerLabel = (
      <span>
        <FontAwesomeIcon icon={faUsers} /> {ownerOrganization.name}
      </span>
    );
  }

  return (
    <Modal show onHide={closeModal}>
      <Modal.Header closeButton>
        <Modal.Title>Share with Teams</Modal.Title>
      </Modal.Header>
      <RequireScope scopeSettingsDescription="To share a blueprint, you must first set an account alias for your PixieBrix account">
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
                <ReactSelect
                  options={organizationsForSelect
                    .filter((x) => !values.organizations.includes(x.id))
                    .map((x) => ({
                      label: x.name,
                      value: x.id,
                    }))}
                  onChange={(selected) => {
                    setFieldValue("organizations", [
                      ...values.organizations,
                      selected.value,
                    ]);
                  }}
                  value={null}
                  placeholder="Add a team"
                />

                <div className={styles.row}>
                  {ownerLabel}
                  <span className="text-muted">Owner</span>
                </div>

                {organizationsForSelect
                  .filter((x) => values.organizations.includes(x.id))
                  .map((organization) => (
                    <div className={styles.row} key={organization.id}>
                      <span>
                        <FontAwesomeIcon icon={faUsers} /> {organization.name}
                      </span>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          const next = values.organizations.filter(
                            (x: string) => x !== organization.id
                          );
                          setFieldValue("organizations", next);
                        }}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </Button>
                    </div>
                  ))}

                <div className={styles.row}>
                  <span className={cx({ "text-muted": !values.public })}>
                    <FontAwesomeIcon icon={faGlobe} /> Public - toggle to share
                    with anyone with link
                  </span>

                  <BootstrapSwitchButton
                    onlabel=" "
                    offlabel=" "
                    checked={values.public}
                    onChange={(checked: boolean) => {
                      setFieldValue("public", checked);
                    }}
                  />
                </div>
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
      </RequireScope>
    </Modal>
  );
};

export default ShareRecipeModal;
