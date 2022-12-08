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
import { selectShowPublishContext } from "@/options/pages/blueprints/modals/blueprintModalsSelectors";
import { blueprintModalsSlice } from "@/options/pages/blueprints/modals/blueprintModalsSlice";
import { sortBy } from "lodash";
import { getErrorMessage } from "@/errors/errorHelpers";
import {
  useGetEditablePackagesQuery,
  useUpdateRecipeMutation,
} from "@/services/api";
import notify from "@/utils/notify";
import { getScopeAndId } from "@/utils";
import { produce } from "immer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInfoCircle,
  faUser,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import ActivationLink from "./ActivationLink";
import { RequireScope } from "@/auth/RequireScope";
import styles from "./ShareRecipeModal.module.scss";
import { selectAuth } from "@/auth/authSelectors";
import { type Organization, UserRole } from "@/types/contract";
import Loading from "./Loading";
import { isSingleObjectBadRequestError } from "@/errors/networkErrorHelpers";
import { useRecipe } from "@/recipes/recipesHooks";

const editorRoles = new Set<number>([UserRole.admin, UserRole.developer]);

const sortOrganizations = (organizations: Organization[]) =>
  sortBy(organizations, (organization) => organization.name);

const PublishRecipeModal: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const { blueprintId } = useSelector(selectShowPublishContext);
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

  const [isPublishing, setPublishing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const closeModal = () => {
    dispatch(blueprintModalsSlice.actions.closeModal());
  };

  // If the was just converted to a blueprint, the API request is likely be in progress and recipe will be null
  if (isFetchingRecipe) {
    return <Loading />;
  }

  const publish = async () => {
    setPublishing(true);
    setError(null);

    try {
      const newRecipe = produce(recipe, (draft) => {
        draft.sharing.public = true;
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
      if (
        isSingleObjectBadRequestError(error) &&
        error.response.data.config?.length > 0
      ) {
        setError(error.response.data.config.join(" "));
        return;
      }

      const message = getErrorMessage(error);
      setError(message);

      notify.error({
        message,
        error,
      });
    } finally {
      setPublishing(false);
    }
  };

  // Sorting returns new array, so it safe to mutate it
  const sortedOrganizations = sortOrganizations(userOrganizations);
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
    const ownerOrganizationIndex = sortedOrganizations.findIndex(
      (x) => x.scope === recipeScope
    );

    if (ownerOrganizationIndex === -1) {
      ownerLabel = (
        <span>
          <FontAwesomeIcon icon={faUsers} /> Unknown
        </span>
      );
    } else {
      const ownerOrganization = sortedOrganizations.splice(
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
        <Modal.Title>Publish to Marketplace</Modal.Title>
      </Modal.Header>
      <RequireScope scopeSettingsDescription="To share a blueprint, you must first set an account alias for your PixieBrix account">
        {hasEditPermissions ? (
          <>
            <Modal.Body>
              {error && <div className="text-danger p-3">{error}</div>}

              <h3>{recipe.metadata.name}</h3>

              <p>
                On Submit, the public link to this blueprint will be shared with
                the{" "}
                <a
                  href="https://www.pixiebrix.com/marketplace/"
                  target="blank"
                  rel="noreferrer noopener"
                >
                  PixieBrix Marketplace
                </a>{" "}
                admin team, who will review your submission and publish your
                blueprint.
              </p>
              <p>
                As soon as you Submit, the public link below will work for
                anyone, so you can start sharing right away!
              </p>

              <ActivationLink blueprintId={blueprintId} />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="link" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={isPublishing || isFetchingEditablePackages}
                onClick={publish}
              >
                Submit
              </Button>
            </Modal.Footer>
          </>
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
            {sortedOrganizations
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
      </RequireScope>
    </Modal>
  );
};

export default PublishRecipeModal;
