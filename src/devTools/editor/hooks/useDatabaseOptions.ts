import { useGetDatabasesQuery, useGetOrganizationsQuery } from "@/services/api";
import { useMemo } from "react";

const useDatabaseOptions = () => {
  const {
    data: databases,
    isLoading: isLoadingDatabases,
  } = useGetDatabasesQuery();
  const {
    data: organizations,
    isLoading: isLoadingOrganizations,
  } = useGetOrganizationsQuery();

  const isLoading = isLoadingDatabases || isLoadingOrganizations;

  const databaseOptions = useMemo(
    () =>
      databases && organizations
        ? databases.map((db) => {
            const organization = organizations.find(
              (o) => o.id === db.organization_id
            );
            const dbName = organization
              ? `${db.name} [${organization.name}]`
              : db.name;

            return {
              label: dbName,
              value: db.id,
            };
          })
        : [],
    [databases, organizations]
  );

  return { databaseOptions, isLoading };
};

export default useDatabaseOptions;
