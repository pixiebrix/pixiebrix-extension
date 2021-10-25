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

import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import { appApi } from "@/services/api";
import { useField } from "formik";
import React, { useEffect } from "react";

const DatabaseGroupSelect = () => {
  const [{ value: selectedOrganizationId }] = useField<string>(
    "organizationId"
  );
  const [
    loadOrganizationGroups,
    { data: groups },
  ] = appApi.endpoints.getGroups.useLazyQuery();

  useEffect(() => {
    if (selectedOrganizationId) {
      loadOrganizationGroups(selectedOrganizationId, true);
    }
  }, [loadOrganizationGroups, selectedOrganizationId]);

  const groupOptions = ((selectedOrganizationId && groups) || []).map(
    (group) => ({
      label: group.name,
      value: group.id,
    })
  );

  return (
    <ConnectedFieldTemplate
      name="groupId"
      label="Group"
      as={SelectWidget}
      options={groupOptions}
      disabled={!selectedOrganizationId}
    />
  );
};

export default DatabaseGroupSelect;
