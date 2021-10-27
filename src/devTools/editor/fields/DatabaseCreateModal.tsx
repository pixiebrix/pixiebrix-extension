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

import React from "react";
import { Button, Modal } from "react-bootstrap";
import Form from "@/components/form/Form";
import * as yup from "yup";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import GridLoader from "react-spinners/GridLoader";
import {
  useAddDatabaseToGroupMutation,
  useCreateDatabaseMutation,
  useGetOrganizationsQuery,
} from "@/services/api";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import DatabaseGroupSelect from "./DatabaseGroupSelect";
import useNotifications from "@/hooks/useNotifications";
import { Organization, UserRole } from "@/types/contract";

type DatabaseCreateModalProps = {
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
  organizationId: string | null;

  /**
   * UUID of a Group for a shared DB, or null/empty for a personal DB.
   */
  groupId: string | null;
};

const DatabaseSchema: yup.ObjectSchema<DatabaseConfig> = yup.object().shape({
  name: yup.string().required(),
  organizationId: yup.string(),
  groupId: yup.string(),
});

const initialValues: DatabaseConfig = {
  name: "",
  organizationId: "",
  groupId: "",
};

function getOrganizationOptions(organizations: Organization[]) {
  const organizationOptions = (organizations ?? [])
    .filter((organization) => organization.role === UserRole.admin)
    .map((organization) => ({
      label: organization.name,
      value: organization.id,
    }));

  const personalDbOption = {
    label: "Personal",
    value: "",
  };

  return [...organizationOptions, personalDbOption];
}

const DatabaseCreateModal: React.FC<DatabaseCreateModalProps> = ({
  onClose,
}) => {
  const {
    data: organizations,
    isLoading: isLoadingOrganizations,
  } = useGetOrganizationsQuery();

  const [createDatabase] = useCreateDatabaseMutation();

  const [addDatabaseToGroup] = useAddDatabaseToGroupMutation();

  const notify = useNotifications();

  const onSave = async ({ name, organizationId, groupId }: DatabaseConfig) => {
    const createDatabaseResult = await createDatabase({
      name,
      organizationId,
    });

    if ("error" in createDatabaseResult) {
      notify.error(createDatabaseResult.error);
    } else if (groupId) {
      const newDb = createDatabaseResult.data;
      const addToGroupResult = await addDatabaseToGroup({
        groupId,
        databaseIds: [newDb.id],
      });
      if ("error" in addToGroupResult) {
        notify.error(addToGroupResult.error);
      }
    }

    onClose();
  };

  const organizationOptions = getOrganizationOptions(organizations);

  return (
    <Modal show onHide={onClose} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Create Database</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {isLoadingOrganizations ? (
          <GridLoader />
        ) : (
          <Form
            validationSchema={DatabaseSchema}
            initialValues={initialValues}
            onSubmit={onSave}
            renderSubmit={({ isSubmitting, isValid }) => (
              <Button type="submit" disabled={!isValid || isSubmitting}>
                Create Database
              </Button>
            )}
          >
            <ConnectedFieldTemplate name="name" label="Name" />
            <ConnectedFieldTemplate
              name="organizationId"
              label="Organization"
              as={SelectWidget}
              options={organizationOptions}
            />

            <DatabaseGroupSelect />
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default DatabaseCreateModal;
