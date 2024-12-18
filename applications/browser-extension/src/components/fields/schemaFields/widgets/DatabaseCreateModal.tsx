/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import React, { useMemo } from "react";
import { Button, Modal } from "react-bootstrap";
import Form from "@/components/form/Form";
import * as yup from "yup";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import Loader from "@/components/Loader";
import {
  useAddDatabaseToGroupMutation,
  useCreateDatabaseMutation,
  useGetOrganizationsQuery,
} from "@/data/service/api";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import DatabaseGroupSelect from "@/components/fields/schemaFields/DatabaseGroupSelect";
import notify from "@/utils/notify";
import { type UUID } from "@/types/stringTypes";
import { validateUUID } from "@/types/helpers";
import { type Team } from "@/data/model/Team";
import { UserRole } from "@/data/model/UserRole";

type DatabaseCreateModalProps = {
  show: boolean;
  onDatabaseCreated: (databaseId: UUID) => void;
  onClose: () => void;
};

type DatabaseConfig = {
  /**
   * The name of the database, unique per Organization/AppUser
   */
  name: string;

  /**
   * UUID of an Organization for a shared DB, or null/empty for a personal DB.
   */
  organizationId?: string;

  /**
   * UUID of a Group for a shared DB, or null/empty for a personal DB.
   */
  groupId?: string;
};

const databaseSchema: yup.SchemaOf<DatabaseConfig> = yup.object().shape({
  name: yup.string().required(),
  organizationId: yup.string(),
  groupId: yup.string().required().nullable(),
});

const initialValues: DatabaseConfig = {
  name: "",
  organizationId: "",
  groupId: "",
};

function getOrganizationOptions(organizations: Team[]) {
  const organizationOptions = (organizations ?? [])
    .filter((organization) =>
      organization.memberships?.some(
        (member) =>
          // If the current user is an admin of the organization, then all of the members are listed for the organization
          // Otherwise, only the current user is listed for the organization
          // So if any listed member is an admin, the current user is an admin
          member.role === UserRole.admin,
      ),
    )
    .map((organization) => ({
      label: organization.teamName,
      value: organization.teamId,
    }));

  const personalDbOption = {
    label: "Personal",
    value: "",
  };

  return [...organizationOptions, personalDbOption];
}

const DatabaseCreateModal: React.FC<DatabaseCreateModalProps> = ({
  show,
  onDatabaseCreated,
  onClose,
}) => {
  const { data: organizations = [], isLoading: isLoadingOrganizations } =
    useGetOrganizationsQuery();

  const [createDatabase] = useCreateDatabaseMutation();

  const [addDatabaseToGroup] = useAddDatabaseToGroupMutation();

  const onSave = async ({ name, organizationId, groupId }: DatabaseConfig) => {
    const createDatabaseResult = await createDatabase({
      name,
      organizationId,
    });

    if ("error" in createDatabaseResult) {
      notify.error({ error: createDatabaseResult.error });
      onClose();
      return;
    }

    const newDbId = validateUUID(createDatabaseResult.data.id);

    if (groupId) {
      const addToGroupResult = await addDatabaseToGroup({
        groupId,
        databaseIds: [newDbId],
      });

      if ("error" in addToGroupResult) {
        notify.error({ error: addToGroupResult.error });
        onClose();
        return;
      }
    }

    onDatabaseCreated(newDbId);
  };

  const organizationOptions = useMemo(
    () => getOrganizationOptions(organizations),
    [organizations],
  );

  return (
    <Modal show={show} onHide={onClose} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Create Database</Modal.Title>
      </Modal.Header>

      {isLoadingOrganizations ? (
        <Modal.Body>
          <Loader />
        </Modal.Body>
      ) : (
        <Form
          validationSchema={databaseSchema}
          initialValues={initialValues}
          onSubmit={onSave}
          renderSubmit={({ isSubmitting, isValid }) => (
            <Modal.Footer>
              <Button variant="info" onClick={onClose}>
                Cancel
              </Button>

              <Button type="submit" disabled={!isValid || isSubmitting}>
                Create Database
              </Button>
            </Modal.Footer>
          )}
        >
          <Modal.Body>
            <ConnectedFieldTemplate name="name" label="Name" />
            <ConnectedFieldTemplate
              name="organizationId"
              label="Organization"
              as={SelectWidget}
              options={organizationOptions}
            />

            <DatabaseGroupSelect />
          </Modal.Body>
        </Form>
      )}
    </Modal>
  );
};

export default DatabaseCreateModal;
