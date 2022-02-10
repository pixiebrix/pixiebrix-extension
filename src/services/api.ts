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

import { AuthState, RegistryId, UUID } from "@/core";
import { BaseQueryFn, createApi } from "@reduxjs/toolkit/query/react";
import {
  EditablePackage,
  RecipeDefinition,
  ServiceDefinition,
  UnsavedRecipeDefinition,
} from "@/types/definitions";
import { AxiosRequestConfig } from "axios";
import { getApiClient, getLinkedApiClient } from "@/services/apiClient";
import { isAxiosError } from "@/errors";
import {
  CloudExtension,
  Database,
  Group,
  MarketplaceListing,
  Organization,
  PackageUpsertResponse,
  PendingInvitation,
  SanitizedAuth,
  UserRole,
} from "@/types/contract";
import { components } from "@/types/swagger";
import { dumpBrickYaml } from "@/runtime/brickYaml";
import { anonAuth, ProfileResponse } from "@/hooks/auth";
import { updateUserData } from "@/auth/token";

// https://redux-toolkit.js.org/rtk-query/usage/customizing-queries#axios-basequery
const appBaseQuery: BaseQueryFn<{
  url: string;
  method: AxiosRequestConfig["method"];
  data?: AxiosRequestConfig["data"];
  requireLinked?: boolean;
  meta?: unknown;
}> = async ({ url, method, data, requireLinked = false, meta }) => {
  try {
    const client = await (requireLinked
      ? getLinkedApiClient()
      : getApiClient());
    const result = await client({ url, method, data });

    return { data: result.data, meta };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        error: { status: error.response?.status, data: error.response?.data },
      };
    }

    throw error;
  }
};

export const appApi = createApi({
  reducerPath: "appApi",
  baseQuery: appBaseQuery,
  tagTypes: [
    "Auth",
    "Databases",
    "Services",
    "ServiceAuths",
    "Organizations",
    "Groups",
    "MarketplaceListings",
    "Recipes",
    "EditablePackages",
    "Invitations",
    "CloudExtensions",
  ],
  endpoints: (builder) => ({
    getAuth: builder.query<AuthState, void>({
      query: () => ({ url: "/api/me/", method: "get" }),
      providesTags: ["Auth"],
      transformResponse: async ({
        id,
        email,
        scope,
        organization,
        telemetry_organization: telemetryOrganization,
        is_onboarded: isOnboarded,
        flags = [],
      }: ProfileResponse) => {
        if (id) {
          void updateUserData({
            user: id,
            email,
            organizationId: organization?.id,
            telemetryOrganizationId: telemetryOrganization?.id,
          });

          return {
            userId: id,
            email,
            scope,
            organization,
            isOnboarded,
            isLoggedIn: true,
            extension: true,
            flags,
          };
        }

        return anonAuth;
      },
    }),

    getDatabases: builder.query<Database[], void>({
      query: () => ({ url: "/api/databases/", method: "get" }),
      providesTags: ["Databases"],
    }),
    createDatabase: builder.mutation<
      Database,
      { name: string; organizationId: string }
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
    getServices: builder.query<ServiceDefinition[], void>({
      query: () => ({ url: "/api/services/", method: "get" }),
      providesTags: ["Services"],
    }),
    getServiceAuths: builder.query<SanitizedAuth[], void>({
      query: () => ({ url: "/api/services/shared/?meta=1", method: "get" }),
      providesTags: ["ServiceAuths"],
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
            (member: { role: number }) => member.role === UserRole.admin
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
      void
    >({
      query: () => ({
        url: "/api/marketplace/listings/?show_detail=true",
        method: "get",
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
    // ToDo use this query in places where "/api/bricks/" is called
    getEditablePackages: builder.query<EditablePackage[], void>({
      query: () => ({ url: "/api/bricks/", method: "get" }),
      providesTags: ["EditablePackages"],
    }),
    getRecipes: builder.query<RecipeDefinition[], void>({
      query: () => ({ url: "/api/recipes/", method: "get" }),
      providesTags: ["Recipes"],
    }),
    getCloudExtensions: builder.query<CloudExtension[], void>({
      query: () => ({ url: "/api/extensions/", method: "get" }),
      providesTags: ["CloudExtensions"],
    }),
    deleteCloudExtension: builder.mutation<
      CloudExtension,
      { extensionId: UUID }
    >({
      query: ({ extensionId }) => ({
        url: `/api/extensions/${extensionId}/`,
        method: "delete",
      }),
      invalidatesTags: ["CloudExtensions"],
    }),
    createRecipe: builder.mutation<
      PackageUpsertResponse,
      {
        recipe: UnsavedRecipeDefinition;
        organizations: UUID[];
        public: boolean;
      }
    >({
      query: ({ recipe, organizations, public: isPublic }) => {
        const recipeConfig = dumpBrickYaml(recipe);

        return {
          url: "api/bricks/",
          method: "post",
          data: {
            config: recipeConfig,
            kind: "recipe" as RecipeDefinition["kind"],
            organizations,
            public: isPublic,
          },
        };
      },
      invalidatesTags: ["Recipes", "EditablePackages"],
    }),
    updateRecipe: builder.mutation<
      PackageUpsertResponse,
      { packageId: UUID; recipe: UnsavedRecipeDefinition }
    >({
      query: ({ packageId, recipe }) => {
        const recipeConfig = dumpBrickYaml(recipe);

        return {
          url: `api/bricks/${packageId}/`,
          method: "put",
          data: {
            config: recipeConfig,
            kind: "recipe" as RecipeDefinition["kind"],
          },
        };
      },
      invalidatesTags: ["Recipes", "EditablePackages"],
    }),
    getInvitations: builder.query<PendingInvitation[], void>({
      query: () => ({ url: "/api/invitations/me", method: "get" }),
      providesTags: ["Invitations"],
    }),
  }),
});

export const {
  useGetAuthQuery,
  useGetDatabasesQuery,
  useCreateDatabaseMutation,
  useAddDatabaseToGroupMutation,
  useGetServicesQuery,
  useGetServiceAuthsQuery,
  useGetMarketplaceListingsQuery,
  useGetOrganizationsQuery,
  useGetGroupsQuery,
  useGetRecipesQuery,
  useGetCloudExtensionsQuery,
  useDeleteCloudExtensionMutation,
  useGetEditablePackagesQuery,
  useCreateRecipeMutation,
  useUpdateRecipeMutation,
  useGetInvitationsQuery,
} = appApi;
