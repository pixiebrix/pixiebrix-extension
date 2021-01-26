/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { MemberRole, Organization } from "@/types/contract";
import { useFetch } from "@/hooks/fetch";
import { useContext, useMemo } from "react";
import { AuthContext } from "@/auth/context";
import { partial } from "lodash";

function isEditable(email: string, organization: Organization): boolean {
  return (organization.members ?? []).some(
    ({ role, user }) => user.email === email && role === MemberRole.Admin
  );
}

export function useOrganization(): {
  organizations: Organization[];
  managedOrganizations: Organization[];
} {
  const organizations = useFetch("/api/organizations/") as Organization[];
  const { email } = useContext(AuthContext);
  const managedOrganizations = useMemo(
    () => (organizations ?? []).filter(partial(isEditable, email)),
    [organizations]
  );
  return { organizations, managedOrganizations };
}
