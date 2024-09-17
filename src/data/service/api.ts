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

import { type UUID } from "@/types/stringTypes";
import { DefinitionKinds, type RegistryId } from "@/types/registryTypes";
import { createApi } from "@reduxjs/toolkit/query/react";
import {
  type Database,
  type Deployment,
  type EditablePackageMetadata,
  type Group,
  type MarketplaceListing,
  type MarketplaceTag,
  type Package,
  type PackageUpsertResponse,
  type PackageVersionDeprecated,
  type PendingInvitation,
  type RetrieveRecipeResponse,
  type RemoteIntegrationConfig,
  type DeploymentPayload,
} from "@/types/contract";
import { type components } from "@/types/swagger";
import { dumpBrickYaml } from "@/runtime/brickYaml";
import { isAxiosError } from "@/errors/networkErrorHelpers";
import { type IntegrationDefinition } from "@/integrations/integrationTypes";
import {
  type ModDefinition,
  type UnsavedModDefinition,
} from "@/types/modDefinitionTypes";
import baseQuery from "@/data/service/baseQuery";
import { type InstalledDeployment } from "@/utils/deploymentUtils";
import { type Me, transformMeResponse } from "@/data/model/Me";
import { type UserMilestone } from "@/data/model/UserMilestone";
import { API_PATHS } from "@/data/service/urlPaths";
import {
  type Organization,
  transformOrganizationResponse,
} from "@/data/model/Organization";

export const appApi = createApi({
  reducerPath: "appApi",
  baseQuery,
  tagTypes: [
    "Me",
    "Auth",
    "Databases",
    "Integrations",
    "IntegrationAuths",
    "Organizations",
    "Groups",
    "MarketplaceListings",
    "MarketplaceTags",
    "EditablePackages",
    "Invitations",
    "StandaloneModDefinitions",
    "Package",
    "PackageVersion",
    "StarterBlueprints",
    "ZapierKey",
    "Deployments",
  ],
  endpoints: (builder) => ({
    getMe: builder.query<Me, void>({
      query: () => ({
        url: API_PATHS.ME,
        method: "get",
      }),
      providesTags: ["Me"],
      transformResponse: transformMeResponse,
    }),
    getFeatureFlags: builder.query<string[], void>({
      query: () => ({
        url: API_PATHS.ME,
        method: "get",
        // The Me endpoint returns an object with only feature flags if not authenticated
        requireLinked: false,
      }),
      transformResponse: (response: components["schemas"]["Me"]) => [
        ...(response.flags ?? []),
      ],
    }),
    getDatabases: builder.query<Database[], void>({
      query: () => ({ url: API_PATHS.DATABASES, method: "get" }),
      providesTags: ["Databases"],
    }),
    createDatabase: builder.mutation<
      Database,
      { name: string; organizationId?: string | undefined }
    >({
      query: ({ name, organizationId }) => ({
        url: organizationId
          ? API_PATHS.ORGANIZATION_DATABASES(organizationId)
          : API_PATHS.DATABASES,
        method: "post",
        data: { name },
      }),
      invalidatesTags: ["Databases"],
    }),
    addDatabaseToGroup: builder.mutation<
      Database,
      { groupId: string; databaseIds: string[] }
    >({
      query: ({ groupId, databaseIds }) => ({
        url: API_PATHS.GROUP_DATABASES(groupId),
        method: "post",
        data: databaseIds.map((id) => ({
          database: id,
        })),
      }),
      invalidatesTags: ["Databases"],
    }),
    getIntegrations: builder.query<IntegrationDefinition[], void>({
      query: () => ({
        url: API_PATHS.INTEGRATIONS,
        method: "get",
        // Returns public service definitions if not authenticated
        requireLinked: false,
      }),
      providesTags: ["Integrations"],
    }),
    getIntegrationAuths: builder.query<RemoteIntegrationConfig[], void>({
      query: () => ({
        url: API_PATHS.INTEGRATIONS_SHARED,
        method: "get",
        params: { meta: 1 },
      }),
      providesTags: ["IntegrationAuths"],
    }),
    getOrganizations: builder.query<Organization[], void>({
      query: () => ({ url: API_PATHS.ORGANIZATIONS, method: "get" }),
      providesTags: ["Organizations"],
      transformResponse: transformOrganizationResponse,
    }),
    getGroups: builder.query<Record<string, Group[]>, string>({
      query: (organizationId) => ({
        url: API_PATHS.ORGANIZATION_GROUPS(organizationId),
        method: "get",
        meta: { organizationId },
        includeRequestData: true,
      }),
      providesTags: (result, error, organizationId) => [
        { type: "Groups", id: organizationId },
      ],
      transformResponse: (
        baseQueryReturnValue: Group[],
        { organizationId }: { organizationId: string },
      ) => ({
        [organizationId]: baseQueryReturnValue,
      }),
    }),
    getMarketplaceListing: builder.query<
      MarketplaceListing | undefined,
      { packageId: RegistryId }
    >({
      query: (params) => ({
        url: API_PATHS.MARKETPLACE_LISTINGS,
        method: "get",
        // Returns public marketplace
        requireLinked: false,
        params: {
          package__name: params.packageId,
        },
      }),
      transformResponse: (baseQueryReturnValue: MarketplaceListing[]) =>
        baseQueryReturnValue[0],
    }),
    getMarketplaceListings: builder.query<
      Record<RegistryId, MarketplaceListing>,
      { package__name?: RegistryId } | void
    >({
      query: (params) => ({
        url: API_PATHS.MARKETPLACE_LISTINGS,
        method: "get",
        // Returns public marketplace
        requireLinked: false,
        params,
      }),
      providesTags: ["MarketplaceListings"],
      transformResponse(
        baseQueryReturnValue: MarketplaceListing[],
      ): Record<RegistryId, MarketplaceListing> {
        return Object.fromEntries(
          baseQueryReturnValue.map((x) => [x.package.name as RegistryId, x]),
        );
      },
    }),
    getMarketplaceTags: builder.query<MarketplaceTag[], void>({
      query: () => ({ url: API_PATHS.MARKETPLACE_TAGS, method: "get" }),
      providesTags: ["MarketplaceTags"],
    }),
    getEditablePackages: builder.query<EditablePackageMetadata[], void>({
      query: () => ({ url: API_PATHS.BRICKS, method: "get" }),
      providesTags: ["EditablePackages"],
    }),
    getModDefinition: builder.query<ModDefinition, { modId: RegistryId }>({
      query: ({ modId }) => ({
        // TODO: switch endpoint https://github.com/pixiebrix/pixiebrix-app/issues/4355
        url: API_PATHS.MOD(modId),
        method: "get",
      }),
      transformResponse(
        baseQueryReturnValue: RetrieveRecipeResponse,
      ): ModDefinition {
        // Pull out sharing and updated_at from response and merge into the base
        // response to create a ModDefinition
        const {
          sharing,
          updated_at,
          config: unsavedModDefinition,
        } = baseQueryReturnValue;
        return {
          ...unsavedModDefinition,
          sharing,
          updated_at,
        };
      },
      // Reminder, RTK Query caching is per-endpoint, not across endpoints. So we want to list the tags here for which
      // we want to watch for invalidation.
      providesTags: (_result, _error, { modId }) => [
        { type: "Package", id: modId },
        "EditablePackages",
      ],
    }),
    createModDefinition: builder.mutation<
      PackageUpsertResponse,
      {
        modDefinition: UnsavedModDefinition;
        organizations: UUID[];
        public: boolean;
        shareDependencies?: boolean;
      }
    >({
      query({
        modDefinition,
        organizations,
        public: isPublic,
        shareDependencies,
      }) {
        const config = dumpBrickYaml(modDefinition);

        return {
          url: API_PATHS.BRICKS,
          method: "post",
          data: {
            config,
            kind: DefinitionKinds.MOD,
            organizations,
            public: isPublic,
            share_dependencies: shareDependencies,
          },
        };
      },
      invalidatesTags: ["EditablePackages"],
    }),
    updateModDefinition: builder.mutation<
      PackageUpsertResponse,
      { packageId: UUID; modDefinition: UnsavedModDefinition }
    >({
      query({ packageId, modDefinition }) {
        const config = dumpBrickYaml(modDefinition);
        const sharing = (modDefinition as ModDefinition).sharing ?? {
          public: false,
          organizations: [],
        };

        return {
          url: API_PATHS.BRICK(packageId),
          method: "put",
          data: {
            id: packageId,
            name: modDefinition.metadata.id,
            config,
            kind: DefinitionKinds.MOD,
            public: sharing.public,
            organizations: sharing.organizations,
          },
        };
      },
      invalidatesTags(result, error, { packageId }) {
        if (isAxiosError(error) && error.response?.status === 400) {
          // Package is invalid, don't invalidate cache because no changes were made on the server.
          return [];
        }

        return [{ type: "Package", id: packageId }, "EditablePackages"];
      },
    }),
    getInvitations: builder.query<PendingInvitation[], void>({
      query: () => ({ url: API_PATHS.ME_INVITATIONS, method: "get" }),
      providesTags: ["Invitations"],
    }),
    getZapierKey: builder.query<{ api_key: string }, void>({
      query: () => ({ url: API_PATHS.WEBHOOKS_KEY, method: "get" }),
      providesTags: ["ZapierKey"],
    }),
    getPackage: builder.query<Package, { id: UUID }>({
      query: ({ id }) => ({ url: API_PATHS.BRICK(id), method: "get" }),
      providesTags: (result, error, { id }) => [{ type: "Package", id }],
    }),
    createPackage: builder.mutation<PackageUpsertResponse, UnknownObject>({
      query(data) {
        return {
          url: API_PATHS.BRICKS,
          method: "post",
          data,
        };
      },
      invalidatesTags: ["EditablePackages"],
    }),
    updatePackage: builder.mutation<
      PackageUpsertResponse,
      { id: UUID } & UnknownObject
    >({
      query(data) {
        return {
          url: API_PATHS.BRICK(data.id),
          method: "put",
          data,
        };
      },
      invalidatesTags(result, error, { id }) {
        if (isAxiosError(error) && error.response?.status === 400) {
          // Package is invalid, don't invalidate cache because no changes were made on the server.
          return [];
        }

        return [{ type: "Package", id }, "EditablePackages", "PackageVersion"];
      },
    }),
    deletePackage: builder.mutation<void, { id: UUID }>({
      query({ id }) {
        return { url: API_PATHS.BRICK(id), method: "delete" };
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "Package", id },
        "EditablePackages",
      ],
    }),
    listPackageVersions: builder.query<
      PackageVersionDeprecated[],
      { packageId: UUID }
    >({
      query: ({ packageId }) => ({
        url: API_PATHS.BRICK_VERSIONS(packageId),
        method: "get",
      }),
      providesTags: (result, error, { packageId }) => [
        { type: "Package", id: packageId },
        { type: "PackageVersion", id: `PACKAGE-${packageId}-LIST` },
        ...(result
          ? result.map((x) => ({
              type: "PackageVersion" as const,
              id: x.id,
            }))
          : []),
      ],
    }),
    updateScope: builder.mutation<
      unknown, // Not using the result yet, need to refine this type if the future if that changes
      Required<Pick<components["schemas"]["Settings"], "scope">>
    >({
      query: ({ scope }) => ({
        url: API_PATHS.ME_SETTINGS,
        method: "patch",
        data: { scope },
      }),
      invalidatesTags: ["Me"],
    }),
    getStarterBlueprints: builder.query<ModDefinition[], void>({
      query: () => ({
        url: API_PATHS.ONBOARDING_STARTER_BLUEPRINTS,
        method: "get",
      }),
      providesTags: (result, error) => [
        { type: "StarterBlueprints", id: "LIST" },
      ],
    }),
    createMilestone: builder.mutation<UserMilestone, UserMilestone>({
      query: (data) => ({
        url: API_PATHS.ME_MILESTONES,
        method: "post",
        data,
      }),
      invalidatesTags: ["Me"],
    }),
    // Post request not used to mutate data on the backend, just to fetch data
    getDeployments: builder.query<
      Deployment[],
      // Uid is used for the clientId property on events in Mixpanel telemetry
      { uid: UUID; version: string; active: InstalledDeployment[] }
    >({
      query: (data) => ({
        url: API_PATHS.DEPLOYMENTS,
        method: "post",
        data,
      }),
      providesTags: ["Deployments"],
    }),
    createUserDeployment: builder.mutation<
      Deployment,
      {
        modDefinition: ModDefinition;
        data: Exclude<DeploymentPayload, "package_version">;
      }
    >({
      async queryFn(
        { modDefinition, data },
        { dispatch },
        _,
        baseQuery,
      ): Promise<
        | {
            data: Deployment;
          }
        | { error: unknown }
      > {
        const {
          data: editablePackages,
          error: editablePackagesError,
          isError: isEditablePackagesError,
        } = await dispatch(appApi.endpoints.getEditablePackages.initiate());

        if (isEditablePackagesError) {
          return { error: editablePackagesError };
        }

        const packageId = editablePackages?.find(
          (x) => x.name === modDefinition.metadata.id,
        )?.id;

        if (!packageId) {
          return {
            error: new Error(
              `Failed to find editable package for mod: ${modDefinition.metadata.id}`,
            ),
          };
        }

        const {
          data: packageVersions = [],
          error: packageVersionsError,
          isError: isPackageVersionsError,
        } = await dispatch(
          appApi.endpoints.listPackageVersions.initiate({
            packageId,
          }),
        );

        if (isPackageVersionsError) {
          return { error: packageVersionsError };
        }

        const packageVersion = packageVersions.find(
          (modVersion) => modVersion.version === modDefinition.metadata.version,
        );

        if (!packageVersion) {
          return {
            error: new Error(
              `Failed to find package version: ${modDefinition.metadata.version}`,
            ),
          };
        }

        const createDeploymentResult = await baseQuery({
          url: API_PATHS.USER_DEPLOYMENTS,
          method: "post",
          data: {
            ...data,
            package_version: packageVersion.id,
          },
        });

        return {
          ...createDeploymentResult,
          data: createDeploymentResult.data as Deployment,
        };
      },
      invalidatesTags: ["Deployments"],
    }),
  }),
});

export const {
  useGetMeQuery,
  useGetFeatureFlagsQuery,
  useGetDatabasesQuery,
  useCreateDatabaseMutation,
  useAddDatabaseToGroupMutation,
  useGetIntegrationsQuery,
  useGetIntegrationAuthsQuery,
  useGetMarketplaceListingQuery,
  useGetMarketplaceListingsQuery,
  useGetMarketplaceTagsQuery,
  useGetOrganizationsQuery,
  useGetZapierKeyQuery,
  useGetEditablePackagesQuery,
  useGetModDefinitionQuery,
  useCreateModDefinitionMutation,
  useUpdateModDefinitionMutation,
  useGetInvitationsQuery,
  useGetPackageQuery,
  useCreatePackageMutation,
  useUpdatePackageMutation,
  useDeletePackageMutation,
  useListPackageVersionsQuery,
  useGetStarterBlueprintsQuery,
  useCreateMilestoneMutation,
  useGetDeploymentsQuery,
  useCreateUserDeploymentMutation,
  util,
} = appApi;
