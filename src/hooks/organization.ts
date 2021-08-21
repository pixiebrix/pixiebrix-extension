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

import { MemberRole, Organization } from "@/types/contract";
import { useContext, useMemo } from "react";
import AuthContext from "@/auth/AuthContext";
import { partial } from "lodash";
import useFetch from "@/hooks/useFetch";

function isEditable(email: string, organization: Organization): boolean {
  return (organization.members ?? []).some(
    ({ role, user }) => user.email === email && role === MemberRole.Admin
  );
}

export function useOrganization(): {
  organizations: Organization[];
  managedOrganizations: Organization[];
} {
  const { data: organizations } = useFetch<Organization[]>(
    "/api/organizations/"
  );
  const { email } = useContext(AuthContext);
  const managedOrganizations = useMemo(
    () => (organizations ?? []).filter(partial(isEditable, email)),
    [organizations, email]
  );
  return { organizations, managedOrganizations };
}
