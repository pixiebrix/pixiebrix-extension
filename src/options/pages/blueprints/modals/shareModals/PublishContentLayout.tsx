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
import { Modal } from "react-bootstrap";
import { useSelector } from "react-redux";
import { selectShowPublishContext } from "@/options/pages/blueprints/modals/blueprintModalsSelectors";
import { sortBy } from "lodash";
import { getScopeAndId } from "@/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInfoCircle,
  faUser,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./ShareModals.module.scss";
import { selectAuth } from "@/auth/authSelectors";
import { type Organization, UserRole } from "@/types/contract";
import { useRecipe } from "@/recipes/recipesHooks";
import { RequireScope } from "@/auth/RequireScope";

const editorRoles = new Set<number>([UserRole.admin, UserRole.developer]);

const sortOrganizations = (organizations: Organization[]) =>
  sortBy(organizations, (organization) => organization.name);

type PublishModalLayoutProps = React.PropsWithChildren<{
  title: string;
}>;

const PublishContentLayout: React.FunctionComponent<
  PublishModalLayoutProps
> = ({ title, children }) => {
  const { blueprintId } = useSelector(selectShowPublishContext);
  const { scope: userScope, organizations: userOrganizations } =
    useSelector(selectAuth);
  const { data: recipe } = useRecipe(blueprintId);

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
      // We get the owner's organization and remove it from the list of organizations (splice mutates the array)
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

  const body = hasEditPermissions ? (
    children
  ) : (
    <Modal.Body>
      <div className="text-info my-3">
        <FontAwesomeIcon icon={faInfoCircle} /> You don&apos;t have permissions
        to change sharing
      </div>
      <div className={styles.row}>
        {ownerLabel}
        <span className="text-muted">Owner</span>
      </div>
      {sortedOrganizations
        .filter((x) => recipe.sharing.organizations.includes(x.id as UUID))
        .map((organization) => (
          <div className={styles.row} key={organization.id}>
            <span>
              <FontAwesomeIcon icon={faUsers} /> {organization.name}
            </span>
          </div>
        ))}
    </Modal.Body>
  );
  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <RequireScope scopeSettingsDescription="To publish a blueprint, you must first set an account alias for your PixieBrix account">
        {body}
      </RequireScope>
    </>
  );
};

export default PublishContentLayout;
