/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { type Kind, type RegistryId } from "@/types/registryTypes";
import { createApi } from "@reduxjs/toolkit/query/react";
import {
  type EditablePackageMetadata,
  type StandaloneModDefinition,
  type Database,
  type Group,
  type MarketplaceListing,
  type MarketplaceTag,
  type Me,
  type Milestone,
  type Organization,
  type Package,
  type PackageUpsertResponse,
  type PackageVersion,
  type PendingInvitation,
  type RecipeResponse,
  type RemoteIntegrationConfig,
  UserRole,
} from "@/types/contract";
import { type components } from "@/types/swagger";
import { dumpBrickYaml } from "@/runtime/brickYaml";
import { type UnknownObject } from "@/types/objectTypes";
import { isAxiosError } from "@/errors/networkErrorHelpers";
import { type IntegrationDefinition } from "@/types/integrationTypes";
import {
  type ModDefinition,
  type UnsavedModDefinition,
} from "@/types/modDefinitionTypes";
import baseQuery from "@/services/baseQuery";

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
    "CloudExtensions",
    "Package",
    "PackageVersion",
    "StarterBlueprints",
    "ZapierKey",
  ],
  endpoints: (builder) => ({
    getMe: builder.query<Me, void>({
      query: () => ({
        url: "/api/me/",
        method: "get",
        // The /api/me/ endpoint returns a blank result if not authenticated
        requireLinked: false,
      }),
      providesTags: ["Me"],
    }),
    getDatabases: builder.query<Database[], void>({
      query: () => ({ url: "/api/databases/", method: "get" }),
      providesTags: ["Databases"],
    }),
    createDatabase: builder.mutation<
      Database,
      { name: string; organizationId?: string | undefined }
    >({
      query: ({ name, organizationId }) => ({
        url: organizationId
          ? `/api/organizations/${organizationId}/databases/`
          : "/api/databases/",
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
        url: `/api/groups/${groupId}/databases/`,
        method: "post",
        data: databaseIds.map((id) => ({
          database: id,
        })),
      }),
      invalidatesTags: ["Databases"],
    }),
    getIntegrations: builder.query<IntegrationDefinition[], void>({
      query: () => ({
        url: "/api/services/",
        method: "get",
        // Returns public service definitions if not authenticated
        requireLinked: false,
      }),
      providesTags: ["Integrations"],
    }),
    getIntegrationAuths: builder.query<RemoteIntegrationConfig[], void>({
      query: () => ({
        url: "/api/services/shared/",
        method: "get",
        params: { meta: 1 },
      }),
      providesTags: ["IntegrationAuths"],
    }),
    getOrganizations: builder.query<Organization[], void>({
      query: () => ({ url: "/api/organizations/", method: "get" }),
      providesTags: ["Organizations"],
      transformResponse: (
        baseQueryReturnValue: Array<components["schemas"]["Organization"]>
      ): Organization[] =>
        baseQueryReturnValue.map((apiOrganization) => ({
          ...apiOrganization,

          // Mapping between the API response and the UI model because we need to know whether the user is an admin of
          // the organization

          // Currently API returns all members only for the organization where the user is an admin,
          // hence if the user is an admin, they will have role === UserRole.admin,
          // otherwise there will be no other members listed (no member with role === UserRole.admin).

          // WARNING: currently this role is only accurate for Admin. All other users are passed as Restricted even if
          // they have a Member or Developer role on the team

          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `organization.members` is about to be removed
          role: (apiOrganization as any).members?.some(
            (member: { role: UserRole }) => member.role === UserRole.admin
          )
            ? UserRole.admin
            : UserRole.restricted,
        })),
    }),
    getGroups: builder.query<Record<string, Group[]>, string>({
      query: (organizationId) => ({
        url: `/api/organizations/${organizationId}/groups/`,
        method: "get",
        meta: { organizationId },
        includeRequestData: true,
      }),
      providesTags: (result, error, organizationId) => [
        { type: "Groups", id: organizationId },
      ],
      transformResponse: (
        baseQueryReturnValue: Group[],
        { organizationId }: { organizationId: string }
      ) => ({
        [organizationId]: baseQueryReturnValue,
      }),
    }),
    getMarketplaceListings: builder.query<
      Record<RegistryId, MarketplaceListing>,
      { package__name?: RegistryId } | void
    >({
      query: (params) => ({
        url: "/api/marketplace/listings/",
        method: "get",
        // Returns public marketplace
        requireLinked: false,
        params,
      }),
      providesTags: ["MarketplaceListings"],
      transformResponse(
        baseQueryReturnValue: MarketplaceListing[]
      ): Record<RegistryId, MarketplaceListing> {
        return Object.fromEntries(
          baseQueryReturnValue.map((x) => [x.package.name as RegistryId, x])
        );
      },
    }),
    getMarketplaceTags: builder.query<MarketplaceTag[], void>({
      query: () => ({ url: "/api/marketplace/tags/", method: "get" }),
      providesTags: ["MarketplaceTags"],
    }),
    getEditablePackages: builder.query<EditablePackageMetadata[], void>({
      query: () => ({ url: "/api/bricks/", method: "get" }),
      providesTags: ["EditablePackages"],
    }),
    getAllCloudExtensions: builder.query<StandaloneModDefinition[], void>({
      query: () => ({ url: "/api/extensions/", method: "get" }),
      providesTags: ["CloudExtensions"],
    }),
    getCloudExtension: builder.query<
      StandaloneModDefinition,
      { extensionId: UUID }
    >({
      query: ({ extensionId }) => ({
        url: `/api/extensions/${extensionId}/`,
        method: "get",
      }),
      providesTags: (result, error, { extensionId }) => [
        { type: "CloudExtensions", extensionId },
        "CloudExtensions",
      ],
    }),
    deleteCloudExtension: builder.mutation<
      StandaloneModDefinition,
      { extensionId: UUID }
    >({
      query: ({ extensionId }) => ({
        url: `/api/extensions/${extensionId}/`,
        method: "delete",
      }),
      invalidatesTags: ["CloudExtensions"],
    }),
    getRecipe: builder.query<ModDefinition, { recipeId: RegistryId }>({
      query: ({ recipeId }) => ({
        url: `/api/recipes/${encodeURIComponent(recipeId)}/`,
        method: "get",
      }),
      transformResponse(baseQueryReturnValue: RecipeResponse): ModDefinition {
        // Pull out sharing and updated_at from response and merge into the base
        // response to create a ModDefinition
        const {
          sharing,
          updated_at,
          config: unsavedRecipeDefinition,
        } = baseQueryReturnValue;
        return {
          ...unsavedRecipeDefinition,
          sharing,
          updated_at,
        };
      },
      // Reminder, RTK Query caching is per-endpoint, not across endpoints. So we want to list the tags here for which
      // we want to watch for invalidation.
      providesTags: (result, error, { recipeId }) => [
        { type: "Package", id: recipeId },
        "EditablePackages",
      ],
    }),
    createRecipe: builder.mutation<
      PackageUpsertResponse,
      {
        recipe: UnsavedModDefinition;
        organizations: UUID[];
        public: boolean;
        shareDependencies?: boolean;
      }
    >({
      query({ recipe, organizations, public: isPublic, shareDependencies }) {
        const recipeConfig = dumpBrickYaml(recipe);

        return {
          url: "/api/bricks/",
          method: "post",
          data: {
            config: recipeConfig,
            kind: "recipe" as Kind,
            organizations,
            public: isPublic,
            share_dependencies: shareDependencies,
          },
        };
      },
      invalidatesTags: ["EditablePackages"],
    }),
    updateRecipe: builder.mutation<
      PackageUpsertResponse,
      { packageId: UUID; recipe: UnsavedModDefinition }
    >({
      query({ packageId, recipe }) {
        const recipeConfig = dumpBrickYaml(recipe);

        return {
          url: `api/bricks/${packageId}/`,
          method: "put",
          data: {
            id: packageId,
            name: recipe.metadata.id,
            config: recipeConfig,
            kind: "recipe" as Kind,
            public: Boolean((recipe as ModDefinition).sharing?.public),
            organizations:
              (recipe as ModDefinition).sharing?.organizations ?? [],
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
      query: () => ({ url: "/api/invitations/me/", method: "get" }),
      providesTags: ["Invitations"],
    }),
    getZapierKey: builder.query<{ api_key: string }, void>({
      query: () => ({ url: "/api/webhooks/key/", method: "get" }),
      providesTags: ["ZapierKey"],
    }),
    getPackage: builder.query<Package, { id: UUID }>({
      query: ({ id }) => ({ url: `/api/bricks/${id}/`, method: "get" }),
      providesTags: (result, error, { id }) => [{ type: "Package", id }],
    }),
    createPackage: builder.mutation<PackageUpsertResponse, UnknownObject>({
      query(data) {
        return {
          url: "api/bricks/",
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
          url: `api/bricks/${data.id}/`,
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
        return { url: `/api/bricks/${id}/`, method: "delete" };
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "Package", id },
        "EditablePackages",
      ],
    }),
    listPackageVersions: builder.query<PackageVersion[], { id: UUID }>({
      query: ({ id }) => ({
        url: `/api/bricks/${id}/versions/`,
        method: "get",
      }),
      providesTags: (result, error, { id }) => [
        { type: "PackageVersion", id: `PACKAGE-${id}-LIST` },
      ],
    }),
    updateScope: builder.mutation<
      unknown, // Not using the result yet, need to refine this type if the future if that changes
      Required<Pick<components["schemas"]["Settings"], "scope">>
    >({
      query: ({ scope }) => ({
        url: "api/settings/",
        method: "patch",
        data: { scope },
      }),
      invalidatesTags: ["Me"],
    }),
    getStarterBlueprints: builder.query<ModDefinition[], void>({
      query: () => ({
        url: "/api/onboarding/starter-blueprints/",
        method: "get",
        data: {
          ignore_user_state: true,
        },
      }),
      providesTags: (result, error) => [
        { type: "StarterBlueprints", id: "LIST" },
      ],
    }),
    createMilestone: builder.mutation<Milestone, Omit<Milestone, "user">>({
      query: (data) => ({
        url: "/api/me/milestones/",
        method: "post",
        data,
      }),
      invalidatesTags: ["Me"],
    }),
  }),
});

export const {
  useGetMeQuery,
  useGetDatabasesQuery,
  useCreateDatabaseMutation,
  useAddDatabaseToGroupMutation,
  useGetIntegrationsQuery,
  useGetIntegrationAuthsQuery,
  useGetMarketplaceListingsQuery,
  useGetMarketplaceTagsQuery,
  useGetOrganizationsQuery,
  useGetGroupsQuery,
  useGetZapierKeyQuery,
  useGetCloudExtensionQuery,
  useGetAllCloudExtensionsQuery,
  useDeleteCloudExtensionMutation,
  useGetEditablePackagesQuery,
  useGetRecipeQuery,
  useCreateRecipeMutation,
  useUpdateRecipeMutation,
  useGetInvitationsQuery,
  useGetPackageQuery,
  useCreatePackageMutation,
  useUpdatePackageMutation,
  useDeletePackageMutation,
  useListPackageVersionsQuery,
  useUpdateScopeMutation,
  useGetStarterBlueprintsQuery,
  useCreateMilestoneMutation,
  util,
} = appApi;
