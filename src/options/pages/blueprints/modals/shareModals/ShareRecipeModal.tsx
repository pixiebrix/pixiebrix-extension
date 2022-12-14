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

import React, { type ReactElement } from "react";
import { type UUID } from "@/core";
import { Button, Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { selectShowShareContext } from "@/options/pages/blueprints/modals/blueprintModalsSelectors";
import { blueprintModalsSlice } from "@/options/pages/blueprints/modals/blueprintModalsSlice";
import * as Yup from "yup";
import { sortBy } from "lodash";
import Form from "@/components/form/Form";
import { getErrorMessage } from "@/errors/errorHelpers";
import {
  useGetEditablePackagesQuery,
  useUpdateRecipeMutation,
} from "@/services/api";
import { type FormikHelpers } from "formik";
import notify from "@/utils/notify";
import { getScopeAndId } from "@/utils";
import { produce } from "immer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInfoCircle,
  faTimes,
  faUser,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { RequireScope } from "@/auth/RequireScope";
import ReactSelect from "react-select";
import styles from "./ShareModals.module.scss";
import { selectAuth } from "@/auth/authSelectors";
import { type Organization, UserRole } from "@/types/contract";
import Loading from "./Loading";
import { isSingleObjectBadRequestError } from "@/errors/networkErrorHelpers";
import { useRecipe } from "@/recipes/recipesHooks";
import ActivationLink from "./ActivationLink";
import createMenuListWithAddButton from "@/components/form/widgets/createMenuListWithAddButton";
import { type Option } from "@/components/form/widgets/SelectWidget";

type ShareInstallableFormState = {
  organizations: UUID[];
};

const editorRoles = new Set<number>([UserRole.admin, UserRole.developer]);

const validationSchema = Yup.object().shape({
  organizations: Yup.array().of(Yup.string().required()),
});

const sortOrganizations = (organizations: Organization[]) =>
  sortBy(organizations, (organization) => organization.name);

const AddATeamMenuList = createMenuListWithAddButton(
  "https://app.pixiebrix.com/teams/create"
);

const ShareRecipeModal: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const { blueprintId } = useSelector(selectShowShareContext);
  const { scope: userScope, organizations: userOrganizations } =
    useSelector(selectAuth);
  const [updateRecipe] = useUpdateRecipeMutation();
  const { data: editablePackages, isFetching: isFetchingEditablePackages } =
    useGetEditablePackagesQuery();
  const {
    data: recipe,
    isFetching: isFetchingRecipe,
    refetch: refetchRecipes,
  } = useRecipe(blueprintId);

  const closeModal = () => {
    dispatch(blueprintModalsSlice.actions.closeModal());
  };

  // If the was just converted to a blueprint, the API request is likely be in progress and recipe will be null
  if (isFetchingRecipe) {
    return <Loading title="Share with Teams" />;
  }

  const initialValues: ShareInstallableFormState = {
    organizations: recipe.sharing.organizations,
  };

  const saveSharing = async (
    formValues: ShareInstallableFormState,
    helpers: FormikHelpers<ShareInstallableFormState>
  ) => {
    try {
      const newRecipe = produce(recipe, (draft) => {
        draft.sharing.organizations = formValues.organizations;
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
      refetchRecipes();
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

  // Sorting returns new array, so it safe to mutate it
  const organizationsForSelect = sortOrganizations(userOrganizations);
  const [recipeScope] = getScopeAndId(recipe?.metadata.id);
  let ownerLabel: ReactElement;
  let hasEditPermissions = false;
  if (recipeScope === userScope) {
    ownerLabel = (
      <span>
        <FontAwesomeIcon icon={faUser} /> You
      </span>
    );
    hasEditPermissions = true;
  } else {
    const ownerOrganizationIndex = organizationsForSelect.findIndex(
      (x) => x.scope === recipeScope
    );

    if (ownerOrganizationIndex === -1) {
      ownerLabel = (
        <span>
          <FontAwesomeIcon icon={faUsers} /> Unknown
        </span>
      );
    } else {
      // We get the owner's organization and remove it from the list of organizations (splice mutates the array)
      const ownerOrganization = organizationsForSelect.splice(
        ownerOrganizationIndex,
        1
      )[0];
      ownerLabel = (
        <span>
          <FontAwesomeIcon icon={faUsers} /> {ownerOrganization.name}
        </span>
      );
      hasEditPermissions = editorRoles.has(ownerOrganization?.role);
    }
  }

  return (
    <Modal show onHide={closeModal}>
      <Modal.Header closeButton>
        <Modal.Title>Share with Teams</Modal.Title>
      </Modal.Header>
      <RequireScope scopeSettingsDescription="To share a blueprint, you must first set an account alias for your PixieBrix account">
        {hasEditPermissions ? (
          <Form
            validationSchema={validationSchema}
            initialValues={initialValues}
            onSubmit={saveSharing}
            renderStatus={({ status }) => (
              <div className="text-danger p-3">{status}</div>
            )}
            renderBody={({ values, setFieldValue }) => (
              <>
                <Modal.Body>
                  <ReactSelect
                    options={organizationsForSelect
                      .filter((x) => !values.organizations.includes(x.id))
                      .map(
                        (x) =>
                          ({
                            label: x.name,
                            value: x.id,
                          } satisfies Option)
                      )}
                    onChange={(selected: Option) => {
                      setFieldValue("organizations", [
                        ...values.organizations,
                        selected.value,
                      ]);
                    }}
                    value={null}
                    placeholder="Add a team"
                    components={{
                      MenuList: AddATeamMenuList,
                    }}
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
                </Modal.Body>
              </>
            )}
            renderSubmit={({ isValid, isSubmitting }) => (
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
            )}
          />
        ) : (
          <Modal.Body>
            <div className="text-info my-3">
              <FontAwesomeIcon icon={faInfoCircle} /> You don&apos;t have
              permissions to change sharing
            </div>
            <div className={styles.row}>
              {ownerLabel}
              <span className="text-muted">Owner</span>
            </div>
            {organizationsForSelect
              .filter((x) =>
                recipe.sharing.organizations.includes(x.id as UUID)
              )
              .map((organization) => (
                <div className={styles.row} key={organization.id}>
                  <span>
                    <FontAwesomeIcon icon={faUsers} /> {organization.name}
                  </span>
                </div>
              ))}
          </Modal.Body>
        )}
        <Modal.Body>
          <h4>Link to share:</h4>
          <p className="mb-1">
            People with access can activate the blueprint with this link
          </p>
          <ActivationLink blueprintId={blueprintId} />
        </Modal.Body>
      </RequireScope>
    </Modal>
  );
};

export default ShareRecipeModal;
