import { MemberRole, Organization } from "@/types/contract";
import { useFetch } from "@/hooks/fetch";
import { useContext, useMemo } from "react";
import { AuthContext } from "@/auth/context";
import partial from "lodash/partial";

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
