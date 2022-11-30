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

import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import { appApi } from "@/services/api";
import { validateUUID } from "@/types/helpers";
import { useField } from "formik";
import React, { useEffect } from "react";
import { UUID } from "@/core";

const groupIdFieldName = "groupId";

const DatabaseGroupSelect = () => {
  const [{ value: selectedOrganizationId }] = useField<UUID>("organizationId");
  const groupField = useField<UUID>(groupIdFieldName);
  const { setValue: setGroupId } = groupField[2];

  const [
    loadOrganizationGroups,
    { data: organizationGroups, isLoading: isGroupsLoading },
  ] = appApi.endpoints.getGroups.useLazyQuery();
  useEffect(() => {
    if (selectedOrganizationId) {
      void loadOrganizationGroups(selectedOrganizationId, true);
    }

    setGroupId("" as UUID, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- not including setGroupId, it's guaranteed to work
  }, [loadOrganizationGroups, selectedOrganizationId]);

  const groupOptions = (
    (selectedOrganizationId &&
      validateUUID(selectedOrganizationId) &&
      // eslint-disable-next-line security/detect-object-injection -- validated for being a UUID
      organizationGroups?.[selectedOrganizationId]) ||
    []
  ).map((group) => ({
    label: group.name,
    value: group.id,
  }));

  return (
    <ConnectedFieldTemplate
      name={groupIdFieldName}
      label="Group"
      as={SelectWidget}
      options={groupOptions}
      isLoading={isGroupsLoading}
      disabled={!selectedOrganizationId}
      description="A group to assign to the database. You can assign additional groups in the Admin Console. You must be a member of the group for it to appear in the Database selection dropdown"
    />
  );
};

export default DatabaseGroupSelect;
