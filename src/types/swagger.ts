import type { UUID, Timestamp } from "@/types/stringTypes";
export interface paths {
  "/api/audit/organizations/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listAuditEvents"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/audit/groups/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listAuditGroups"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/audit/deployments/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listAuditDeployments"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/registry/bricks/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description Registry view of current version of each package. */
    get: operations["listRegistryBricks"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/registry/bricks/{name}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description Registry view of current version of each package. */
    get: operations["retrieveRegistryBricks"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/registry/query/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description Queries Packages and UserExtension by JsonPath. */
    get: operations["retrievePackageQueryResult"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/recipes/{name}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description Registry view of current version of each package. */
    get: operations["retrieveRecipes"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/services/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description Registry view of current version of each package. */
    get: operations["listServices"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/bricks/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description View for editable brick packages in the registry. */
    get: operations["listPackageMeta"];
    put?: never;
    /** @description View for editable brick packages in the registry. */
    post: operations["createPackage"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/bricks/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description View for editable brick packages in the registry. */
    get: operations["retrievePackage"];
    /** @description View for editable brick packages in the registry. */
    put: operations["updatePackage"];
    post?: never;
    /** @description View for editable brick packages in the registry. */
    delete: operations["destroyPackage"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/bricks/{id}/versions/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listPackageVersionSlims"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/databases/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listUserDatabases"];
    put?: never;
    post: operations["createUserDatabase"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/databases/records/jobs/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveDatabaseExportJob"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/databases/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveUserDatabase"];
    put?: never;
    post?: never;
    delete: operations["destroyUserDatabase"];
    options?: never;
    head?: never;
    patch: operations["updateUserDatabase"];
    trace?: never;
  };
  "/api/databases/{id}/permissions/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveUserDatabasePermission"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/databases/{database_pk}/records/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listRecords"];
    put: operations["updateRecord"];
    post: operations["createRecord"];
    delete: operations["clearRecord"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/databases/{database_pk}/records/{key}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveRecordDetail"];
    put: operations["updateRecordDetail"];
    post?: never;
    delete: operations["destroyRecordDetail"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/databases/{database_pk}/references/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description List bricks that use a database. */
    get: operations["listDatabaseReferences"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/databases/{database_pk}/deployments/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description List deployments that use a database. */
    get: operations["listDatabaseDeployments"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/campaigns/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listCampaigns"];
    put?: never;
    post: operations["createCampaign"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/campaigns/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveCampaign"];
    put?: never;
    post?: never;
    delete: operations["destroyCampaign"];
    options?: never;
    head?: never;
    patch: operations["partialUpdateCampaign"];
    trace?: never;
  };
  "/api/campaigns/{campaign_pk}/jobs/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveCampaignEngagementJob"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/campaigns/{campaign_pk}/databases/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listCampaignDatabases"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/campaigns/{campaign_pk}/members/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description Paginated view of members in a Campaign. */
    get: operations["listCampaignMembers"];
    /** @description Paginated view of members in a Campaign. */
    put: operations["updateCampaignMember"];
    /** @description Paginated view of members in a Campaign. */
    post: operations["createCampaignMember"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/deployments/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description View for individual users to report/retrieve available deployments. */
    get: operations["listUserDeploymentDetails"];
    put?: never;
    /** @description Record which deployments the user has installed, and return list of available deployments. */
    post: operations["telemetryListUserDeploymentDetail"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/deployments/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description View for admins to get/update/delete a single deployment. */
    get: operations["retrieveDeploymentDetail"];
    /** @description View for admins to get/update/delete a single deployment. */
    put: operations["updateDeploymentDetail"];
    post?: never;
    /** @description View for admins to get/update/delete a single deployment. */
    delete: operations["destroyDeploymentDetail"];
    options?: never;
    head?: never;
    /** @description View for admins to get/update/delete a single deployment. */
    patch: operations["partialUpdateDeploymentDetail"];
    trace?: never;
  };
  "/api/deployments/{deployment_pk}/dependencies/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveDeploymentDependencies"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/deployments/{deployment_pk}/reports/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listDeploymentReportMetadata"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/deployments/{deployment_pk}/reports/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveDeploymentReport"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/deployments/{deployment_pk}/reports/{report_pk}/jobs/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveDeploymentReportJob"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/deployments/{deployment_pk}/users/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listActiveDeployments"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/deployments/{deployment_pk}/errors/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listDeploymentErrors"];
    put?: never;
    post?: never;
    delete: operations["destroyDeploymentErrors"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/deployments/{deployment_pk}/groups/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listDeploymentPermissions"];
    put?: never;
    post: operations["createDeploymentPermission"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/deployments/{deployment_pk}/managers/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listDeploymentManagerPermissions"];
    put?: never;
    post: operations["createDeploymentManagerPermission"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/deployments/{deployment_pk}/contacts/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listDeploymentAlertEmails"];
    put?: never;
    post: operations["createDeploymentAlertEmail"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/deployments/{deployment_pk}/contacts/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveDeploymentAlertEmail"];
    put: operations["updateDeploymentAlertEmail"];
    post?: never;
    delete: operations["destroyDeploymentAlertEmail"];
    options?: never;
    head?: never;
    patch: operations["partialUpdateDeploymentAlertEmail"];
    trace?: never;
  };
  "/api/extensions/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listUserExtensions"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/extensions/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveUserExtensionDetail"];
    put: operations["updateUserExtensionDetail"];
    post?: never;
    delete: operations["destroyUserExtensionDetail"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/groups/{group_pk}/memberships/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description Add, remove, and list users to/from a group */
    get: operations["listGroupMemberships"];
    /** @description Add, remove, and list users to/from a group */
    put: operations["updateGroupMembership"];
    /** @description Add, remove, and list users to/from a group */
    post: operations["createGroupMembership"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/groups/{id}/permissions/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listGroupPackagePermissions"];
    put?: never;
    post: operations["createGroupPackagePermission"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/groups/{id}/integrations/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listServiceAuthPermissions"];
    put?: never;
    post: operations["createServiceAuthPermission"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/groups/{group_pk}/integrations/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveServiceAuthPermission"];
    put: operations["updateServiceAuthPermission"];
    post?: never;
    delete: operations["destroyServiceAuthPermission"];
    options?: never;
    head?: never;
    patch: operations["partialUpdateServiceAuthPermission"];
    trace?: never;
  };
  "/api/groups/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveGroup"];
    put: operations["updateGroup"];
    post?: never;
    delete: operations["destroyGroup"];
    options?: never;
    head?: never;
    patch: operations["partialUpdateGroup"];
    trace?: never;
  };
  "/api/groups/{group_pk}/databases/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listDatabasePermissions"];
    put?: never;
    post: operations["createList"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/groups/{group_pk}/databases/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveDatabasePermission"];
    put?: never;
    post?: never;
    delete: operations["destroyDatabasePermission"];
    options?: never;
    head?: never;
    patch: operations["partialUpdateDatabasePermission"];
    trace?: never;
  };
  "/api/invitations/me/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listMeInvitations"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/invitations/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listOrganizationInvitations"];
    put?: never;
    post: operations["createOrganizationInvitation"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/magic-link/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["loginMagicLink"];
    put?: never;
    post: operations["createMagicLink"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/marketplace/listings/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listMarketplaceListings"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/marketplace/listings/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveMarketplaceListing"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/marketplace/tags/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listTags"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/me/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveMe"];
    put?: never;
    post?: never;
    delete: operations["destroyMe"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/me/token/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description Return the token for the current user. */
    get: operations["retrieveAuthToken"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/memberships/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description Detail view for an organization's memberships. */
    get: operations["retrieveOrganizationMembership"];
    /** @description Detail view for an organization's memberships. */
    put: operations["updateOrganizationMembership"];
    post?: never;
    /** @description Detail view for an organization's memberships. */
    delete: operations["destroyOrganizationMembership"];
    options?: never;
    head?: never;
    /** @description Detail view for an organization's memberships. */
    patch: operations["partialUpdateOrganizationMembership"];
    trace?: never;
  };
  "/api/onboarding/starter-blueprints/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listStarterBlueprints"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listOrganizations"];
    put?: never;
    post: operations["createOrganization"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveOrganization"];
    put?: never;
    post?: never;
    delete: operations["destroyOrganization"];
    options?: never;
    head?: never;
    patch: operations["partialUpdateOrganization"];
    trace?: never;
  };
  "/api/organizations/{organization_pk}/members/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveUserDetail"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/deployment-keys/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listDeploymentKeys"];
    put?: never;
    post: operations["createDeploymentKey"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/deployment-keys/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveDeploymentKey"];
    put?: never;
    post?: never;
    delete: operations["destroyDeploymentKey"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/groups/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listGroups"];
    put?: never;
    post: operations["createGroup"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/deployments/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description View for admins to list/create deployments. */
    get: operations["listDeployments"];
    put?: never;
    /** @description View for admins to list/create deployments. */
    post: operations["createDeployment"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/bricks/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listOrganizationBricks"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/blueprints/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listOrganizationBlueprints"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/integrations/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listServiceAuthMeta"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/memberships/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description List view of an organization's memberships. */
    get: operations["listMemberships"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/databases/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveDatabase"];
    put: operations["updateDatabase"];
    post?: never;
    delete: operations["destroyDatabase"];
    options?: never;
    head?: never;
    patch: operations["partialUpdateDatabase"];
    trace?: never;
  };
  "/api/organizations/{organization_pk}/databases/{database_pk}/schema/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveDatabaseSchema"];
    put: operations["updateDatabaseSchema"];
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/databases/{database_pk}/record-archives/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listDatabaseRecordsArchives"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/databases/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listDatabases"];
    put?: never;
    post: operations["createDatabase"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/subscriptions/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listSubscriptions"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/backup/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["exportOrganizationBackup"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/errors/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listOrganizationErrors"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/events/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listEventIntervals"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/contacts/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listOrganizationContacts"];
    put?: never;
    post: operations["createOrganizationContact"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/contacts/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveOrganizationContact"];
    put: operations["updateOrganizationContact"];
    post?: never;
    delete: operations["destroyOrganizationContact"];
    options?: never;
    head?: never;
    patch: operations["partialUpdateOrganizationContact"];
    trace?: never;
  };
  "/api/organizations/{organization_pk}/auth-url-patterns/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listOrganizationAuthUrlPatterns"];
    put: operations["updateList"];
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_id}/theme/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveOrganizationTheme"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/control-rooms/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveControlRoom"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/control-rooms/configurations/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveControlRoomConfiguration"];
    put?: never;
    post?: never;
    delete: operations["destroyControlRoomConfiguration"];
    options?: never;
    head?: never;
    patch: operations["partialUpdateControlRoomConfiguration"];
    trace?: never;
  };
  "/api/permissions/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveGroupPackagePermission"];
    put: operations["updateGroupPackagePermission"];
    post?: never;
    delete: operations["destroyGroupPackagePermission"];
    options?: never;
    head?: never;
    patch: operations["partialUpdateGroupPackagePermission"];
    trace?: never;
  };
  "/api/services/shared/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listSanitizedAuths"];
    put?: never;
    post: operations["createEditableAuth"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/services/shared/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveEditableAuth"];
    put: operations["updateEditableAuth"];
    post?: never;
    delete: operations["destroyEditableAuth"];
    options?: never;
    head?: never;
    patch: operations["partialUpdateEditableAuth"];
    trace?: never;
  };
  "/api/settings/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveSettings"];
    put: operations["updateSettings"];
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch: operations["partialUpdateSettings"];
    trace?: never;
  };
  "/api/support/users/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listSupportUsers"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/support/users/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveSupportUsers"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/support/users/{user_pk}/events/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveSupportUserEvents"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/support/users/{user_pk}/errors/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listUserErrors"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/support/users/{user_pk}/bricks/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listSupportUserBricks"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/support/users/{user_pk}/bricks/{brick_pk}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveSupportUserBricks"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/support/intercom": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listIntercoms"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/telemetry/errors/public-blueprints/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listPublicBlueprintErrorItemGroups"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/telemetry/errors/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["retrieveErrorDetail"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/tests/cypress/constants/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listCypressConstants"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/registry/updates/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createPackageVersionUpdates"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/databases/records/jobs/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createDatabaseExportJob"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/databases/{database_pk}/queue/assign/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** @description Get the next available item in a queue.
     *
     *     Runs as an atomic operation so multiple clients don't get assigned the same task. */
    post: operations["createQueueAssign"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/campaigns/{campaign_pk}/jobs/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createCampaignEngagementJob"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/campaigns/{campaign_pk}/emails/jobs/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createCampaignEmailJob"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/deployments/{deployment_pk}/messages/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createDeploymentMessage"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/deployments/{deployment_pk}/reports/{report_pk}/jobs/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createDeploymentReportJob"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/deployments/{deployment_pk}/alerts/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createDeploymentAlert"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/events/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createEventList"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/identify/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createIdentify"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/invitations/{id}/accept/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["acceptMeInvitation"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/invitations/{id}/reject/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["rejectMeInvitation"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/me/milestones/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createMilestone"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/onboarding/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createOnboarding"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/provisioned-accounts/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createProvisionedAccount"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/control-rooms/configurations/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createControlRoomConfiguration"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/proxy/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** @description API authentication proxy. */
    post: operations["createProxiedRequest"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/telemetry/errors/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createErrorItem"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/telemetry/external/events/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** @description Endpoint for recording custom user telemetry via service account, e.g., from Zapier. */
    post: operations["createExternalEvent"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/tests/cypress/seed/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createSeedCypress"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/deployments/{deployment_pk}/groups/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    delete: operations["destroyDeploymentPermission"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/deployments/{deployment_pk}/managers/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    delete: operations["destroyDeploymentManagerPermission"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/groups/{group_pk}/memberships/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    /** @description Add, remove, and list users to/from a group */
    delete: operations["destroyGroupMembership"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/organizations/{organization_pk}/invitations/{id}/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    delete: operations["destroyOrganizationInvitation"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/tests/accounts/social/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    delete: operations["destroyDeleteTestSocialAccount"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/tests/accounts/rainforest/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    delete: operations["destroyDeleteRainforestAccount"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    AuditEvent: {
      /** Format: uuid */
      readonly id?: UUID;
      actor: {
        /** Format: uuid */
        readonly id?: UUID;
        /** Format: email */
        email?: string;
      };
      target_object: {
        id: string;
        readonly content_type?: string;
        readonly label?: string;
      };
      action_object: {
        id: string;
        readonly content_type?: string;
        readonly label?: string;
      };
      action_type: string;
      data?: {
        [key: string]: unknown;
      } | null;
      /** Format: date-time */
      readonly timestamp?: Timestamp;
    };
    PackageConfigList: {
      apiVersion: string;
      kind: string;
      metadata: {
        [key: string]: unknown;
      };
    };
    PackageConfig: {
      /**
       * Format: uuid
       * @description Surrogate primary key
       */
      readonly id?: UUID;
      /** @description Unique package identifier, including the scope and collection */
      name: string;
      /** @description Human-readable name */
      verbose_name?: string | null;
      readonly version?: string;
      kind: string;
      /** Format: date-time */
      readonly updated_at?: Timestamp;
      sharing: {
        public?: boolean;
        organizations?: string[];
      };
      readonly config?: {
        [key: string]: unknown;
      };
    };
    PackageQueryResult: {
      /**
       * Format: uuid
       * @description Surrogate primary key
       */
      readonly id?: UUID;
      natural_id: string;
      readonly kind?: string;
      user: {
        /** Format: uuid */
        readonly id?: UUID;
        readonly name?: string;
        /** Format: email */
        email?: string;
        readonly service_account?: boolean;
        readonly deployment_key_account?: boolean;
        /** Format: date-time */
        date_joined?: Timestamp;
      };
      organization: {
        /** Format: uuid */
        readonly id?: UUID;
        name: string;
      };
      /** @description Human-readable name */
      verbose_name?: string | null;
      /** Format: date-time */
      readonly created_at?: Timestamp;
      /** Format: date-time */
      updated_at?: Timestamp;
      is_public: boolean;
    };
    PackageMeta: {
      /**
       * Format: uuid
       * @description Surrogate primary key
       */
      readonly id?: UUID;
      /** @description Unique package identifier, including the scope and collection */
      name: string;
      /** @description Human-readable name */
      verbose_name?: string | null;
      readonly version?: string;
      kind: string;
      /** Format: date-time */
      readonly updated_at?: Timestamp;
      sharing: {
        public?: boolean;
        organizations?: string[];
      };
    };
    Package: {
      /**
       * Format: uuid
       * @description Surrogate primary key
       */
      readonly id?: UUID;
      readonly name?: string;
      kind: string;
      readonly version?: string;
      /** @default false */
      share_dependencies: boolean;
      config: string;
      /** @default false */
      public: boolean;
      organizations?: string[];
      /** Format: date-time */
      readonly updated_at?: Timestamp;
      /** @description Human-readable name */
      verbose_name?: string | null;
    };
    PackageVersionSlim: {
      /** Format: uuid */
      id: UUID;
      package_id: string;
      name: string;
      readonly version?: string;
      /** Format: date-time */
      readonly created_at?: Timestamp;
      /** Format: date-time */
      updated_at?: Timestamp;
    };
    Database: {
      /** Format: uuid */
      readonly id?: UUID;
      name: string;
      organization_id?: string;
      /** Format: date-time */
      readonly created_at?: Timestamp;
      /** @description Enforce the JSON Schema for database records */
      enforce_schema?: boolean;
      /** @description Field indicating the record owner */
      owner_field?: string | null;
      user?: string;
      /** Format: date-time */
      readonly last_write_at?: Timestamp;
      readonly num_records?: number;
    };
    DatabaseExportJob: {
      /** Format: uuid */
      id: UUID;
      /** @enum {string} */
      status?: "UNKNOWN" | "PENDING" | "STARTED" | "SUCCESS" | "FAILURE";
      /** Format: date-time */
      readonly created_at?: Timestamp;
      /** Format: binary */
      data?: string | null;
      error_message?: string | null;
    };
    UserDatabasePermission: {
      /** @description Array of permissions for the database. */
      readonly permissions?: (1 | 2)[];
    };
    Record: {
      id: string;
      data: {
        [key: string]: unknown;
      };
      /**
       * @default replace
       * @enum {string}
       */
      merge_strategy: "replace" | "deep" | "deep_append" | "shallow" | "";
      /** Format: date-time */
      readonly created_at?: Timestamp;
    };
    Deployment: {
      /** Format: uuid */
      readonly id?: UUID;
      name: string;
      active?: boolean;
      /** Format: date-time */
      readonly created_at?: Timestamp;
      /** Format: date-time */
      readonly updated_at?: Timestamp;
      readonly package?: {
        /** Format: uuid */
        id: UUID;
        package_id: string;
        name: string;
        readonly version?: string;
        /** Format: date-time */
        readonly created_at?: Timestamp;
        /** Format: date-time */
        updated_at?: Timestamp;
      };
      package_version: string;
      services: {
        auth: string;
      }[];
      options_config?: {
        [key: string]: unknown;
      };
    };
    Campaign: {
      /** Format: uuid */
      readonly id?: UUID;
      name: string;
      /** Format: date-time */
      readonly created_at?: Timestamp;
      /** Format: date-time */
      readonly updated_at?: Timestamp;
    };
    Job: {
      id: string;
      /** @enum {string} */
      status?: "UNKNOWN" | "PENDING" | "STARTED" | "SUCCESS" | "FAILURE";
    };
    CampaignDatabase: {
      /** Format: uuid */
      readonly id?: UUID;
      name: string;
      organization_id?: string;
      /** Format: date-time */
      readonly created_at?: Timestamp;
      /** @description Enforce the JSON Schema for database records */
      enforce_schema?: boolean;
      /** @description Field indicating the record owner */
      owner_field?: string | null;
      user?: string;
      /** Format: date-time */
      readonly last_write_at?: Timestamp;
      readonly num_records?: number;
      readonly groups?: {
        /** Format: uuid */
        id: UUID;
        name: string;
      }[];
    };
    CampaignMember: {
      /** Format: uuid */
      readonly id?: UUID;
      /** Format: email */
      email: string;
      data: {
        [key: string]: unknown;
      };
      readonly account?: {
        /** Format: uuid */
        readonly id?: UUID;
        readonly name?: string;
        /** Format: email */
        email?: string;
        readonly service_account?: boolean;
        readonly deployment_key_account?: boolean;
        /** Format: date-time */
        date_joined?: Timestamp;
      };
      readonly latest_client?: {
        extension_version: string;
        /** Format: date-time */
        readonly created_at?: Timestamp;
        /** Format: date-time */
        readonly updated_at?: Timestamp;
        readonly active_deployments?: UUID[];
      };
      readonly groups?: UUID[];
      readonly assigned_deployments?: {
        /** Format: uuid */
        id: UUID;
        name: string;
      }[];
      /** Format: date-time */
      readonly created_at?: Timestamp;
      /** Format: date-time */
      readonly updated_at?: Timestamp;
      /** Format: date-time */
      readonly last_active_at?: Timestamp | null;
    };
    DeploymentDetail: {
      /** Format: uuid */
      readonly id?: UUID;
      name: string;
      /** Format: date-time */
      readonly created_at?: Timestamp;
      /** Format: date-time */
      readonly updated_at?: Timestamp;
      readonly package?: {
        /** Format: uuid */
        id: UUID;
        package_id: string;
        name: string;
        readonly version?: string;
        /** Format: date-time */
        readonly created_at?: Timestamp;
        /** Format: date-time */
        updated_at?: Timestamp;
      };
      readonly bindings?: {
        /** Format: uuid */
        readonly id?: UUID;
        /** Format: date-time */
        readonly created_at?: Timestamp;
        /** @description Key for named integration dependencies */
        key?: string | null;
        auth: {
          /** Format: uuid */
          readonly id?: UUID;
          service_id: string;
          label?: string | null;
        };
      }[];
      active?: boolean;
      options_config?: {
        [key: string]: unknown;
      };
      package_version: string;
      services: {
        auth: string;
      }[];
    };
    DeploymentTelemetry: {
      /**
       * Format: uuid
       * @description The UID of the PixieBrix extension instance (varies by install)
       */
      uid: UUID;
      /** @description The version of the PixieBrix extension */
      version: string;
      active?: {
        [key: string]: unknown;
      }[];
    };
    DependencyTree: {
      name: string;
      kind: string;
      id: string;
      registry_id: string;
      database_id: string;
    };
    DeploymentReportMetadata: {
      /** Format: uuid */
      id: UUID;
      /** @description A human-readable name/label for the report */
      name: string;
      timezone: string;
    };
    DeploymentReport: {
      /**
       * Format: uuid
       * @description The id of the report
       */
      id: UUID;
      /** @description The name of the report */
      name: string;
      /**
       * Format: date-time
       * @description Report generation timestamp
       */
      timestamp: Timestamp;
      data: {
        /** Format: email */
        email: string;
        /** Format: date */
        timestamp: string;
        event_name: string;
        event_label: string;
        value: number;
      }[];
    };
    ActiveDeployment: {
      /** Format: uuid */
      client_uuid: UUID;
      user: {
        /** Format: uuid */
        readonly id?: UUID;
        /** Format: email */
        email?: string;
      };
      /** Format: date-time */
      readonly created_at?: Timestamp;
      /** Format: date-time */
      readonly updated_at?: Timestamp;
      readonly version?: string;
      readonly client_version?: string;
    };
    ErrorItemGroup: {
      request_url: string | null;
      deployment: string | null;
      extension_label: string | null;
      /** Format: date-time */
      last_occurrence_timestamp: Timestamp;
      message: string;
      occurrence_count: number;
      people_count: number;
      step_label: string | null;
      user_agent_extension_version: string;
    };
    DeploymentPermission: {
      /** Format: uuid */
      readonly id?: UUID;
      /** Format: uuid */
      group_id: UUID;
      readonly group_name?: string;
      /** Format: date-time */
      readonly created_at?: Timestamp;
    };
    DeploymentManagerPermission: {
      /** Format: uuid */
      readonly id?: UUID;
      group_id: string;
      readonly group_name?: string;
      /** Format: date-time */
      readonly created_at?: Timestamp;
    };
    DeploymentAlertEmail: {
      /** Format: uuid */
      readonly id?: UUID;
      /** Format: email */
      email: string;
      notify_error?: boolean;
      notify_uninstall?: boolean;
    };
    GroupMembership: {
      /** Format: uuid */
      readonly id?: UUID;
      readonly user?: {
        /** Format: uuid */
        readonly id?: UUID;
        readonly name?: string;
        /** Format: email */
        email?: string;
        readonly service_account?: boolean;
        readonly deployment_key_account?: boolean;
        /** Format: date-time */
        date_joined?: Timestamp;
      };
      /** Format: uuid */
      user_id?: UUID;
      /** Format: email */
      email?: string;
      /** Format: date-time */
      readonly created_at?: Timestamp;
      readonly campaigns?: {
        /** Format: uuid */
        readonly id?: UUID;
        name: string;
        /** Format: date-time */
        readonly created_at?: Timestamp;
        /** Format: date-time */
        readonly updated_at?: Timestamp;
      }[];
      /** Format: date-time */
      readonly last_active_at?: Timestamp;
    };
    GroupPackagePermission: {
      /** Format: uuid */
      readonly id?: UUID;
      /** @enum {integer} */
      permission?: 1 | 2;
      /** Format: date-time */
      readonly created_at?: Timestamp;
      package_name: string;
    };
    ServiceAuthPermission: {
      /** Format: uuid */
      readonly id?: UUID;
      /** @enum {integer} */
      permission?: 1 | 2;
      /** Format: date-time */
      readonly created_at?: Timestamp;
      label: string;
      service_id: string;
    };
    GroupDetail: {
      /** Format: uuid */
      readonly id?: UUID;
      name: string;
      /** Format: date-time */
      readonly created_at?: Timestamp;
      readonly deployments?: {
        /** Format: uuid */
        id: UUID;
        name: string;
      }[];
    };
    DatabasePermission: {
      /** Format: uuid */
      readonly id?: UUID;
      readonly database_name?: string;
      database: string;
      /** @enum {integer} */
      permission?: 1 | 2;
      /** Format: date-time */
      readonly created_at?: Timestamp;
    };
    PendingInvitation: {
      /** Format: uuid */
      readonly id?: UUID;
      /** Format: email */
      email: string;
      inviter?: {
        /** Format: uuid */
        readonly id?: UUID;
        readonly name?: string;
        /** Format: email */
        email?: string;
        readonly service_account?: boolean;
        readonly deployment_key_account?: boolean;
        /** Format: date-time */
        date_joined?: Timestamp;
      };
      readonly organization?: {
        /** Format: uuid */
        readonly id?: UUID;
        name: string;
      };
      /** @enum {integer} */
      role?: 1 | 2 | 3 | 4 | 5;
    };
    MarketplaceListing: {
      /**
       * Format: uuid
       * @description Surrogate key of the listing
       */
      readonly id?: UUID;
      package: {
        /**
         * Format: uuid
         * @description Surrogate primary key
         */
        readonly id?: UUID;
        readonly name?: string;
        kind: string;
        description: string;
        /** @description Human-readable name */
        verbose_name?: string | null;
        readonly version?: string;
        config: {
          [key: string]: unknown;
        };
        author: {
          scope?: string | null;
        };
        organization: {
          scope?: string | null;
        };
      };
      /** @description Markdown-formatted instructions */
      instructions?: string;
      assets: {
        /** Format: uuid */
        readonly id?: UUID;
        listing: string;
        /** @description A plain-text caption for the asset */
        caption?: string | null;
        /** Format: uri */
        readonly url?: string;
        /** @description The order in which the asset will appear in the listing */
        order?: number;
        /** Format: date-time */
        readonly created_at?: Timestamp;
        /** Format: date-time */
        readonly updated_at?: Timestamp;
      }[];
      /** @description Font Awesome 5 icon and css class to show with the tag, e.g., fas fa-coffee */
      fa_icon?: string | null;
      icon_color?: string;
      tags: {
        /**
         * Format: uuid
         * @description Surrogate key for the tag
         */
        readonly id?: UUID;
        /** @description The name/caption to show in the tag */
        name: string;
        /** @description The URL slug for the tag */
        slug?: string;
        /** @description Font Awesome 5 icon and css class to show with the tag, e.g., fas fa-coffee */
        fa_icon?: string | null;
        /**
         * @description The sub-type/category of the tag
         * @default generic
         * @enum {string}
         */
        subtype:
          | "generic"
          | "role"
          | "service"
          | "category"
          | "persona"
          | "pixie_picks"
          | "use_case"
          | "other";
        /** Format: date-time */
        readonly created_at?: Timestamp;
        /** Format: date-time */
        readonly updated_at?: Timestamp;
      }[];
      image: {
        /** @description Alt text for the logo */
        alt_text?: string | null;
        /** Format: uri */
        url: string;
      };
      /**
       * Format: uri
       * @description Example web page to try out the package
       */
      example_page_url?: string | null;
      /** @description Designates a listing that is undiscoverable in the Marketplace; only those with a direct link can access it. */
      unlisted?: boolean;
      /** Format: date-time */
      readonly created_at?: Timestamp;
      /** Format: date-time */
      readonly updated_at?: Timestamp;
    };
    Tag: {
      /**
       * Format: uuid
       * @description Surrogate key for the tag
       */
      readonly id?: UUID;
      /** @description The name/caption to show in the tag */
      name: string;
      /** @description The URL slug for the tag */
      slug?: string;
      /** @description Font Awesome 5 icon and css class to show with the tag, e.g., fas fa-coffee */
      fa_icon?: string | null;
      /**
       * @description The sub-type/category of the tag
       * @default generic
       * @enum {string}
       */
      subtype:
        | "generic"
        | "role"
        | "service"
        | "category"
        | "persona"
        | "pixie_picks"
        | "use_case"
        | "other";
      /** Format: date-time */
      readonly created_at?: Timestamp;
      /** Format: date-time */
      readonly updated_at?: Timestamp;
    };
    Me: {
      readonly flags?: string[];
      /** Format: uuid */
      readonly id?: UUID;
      scope?: string | null;
      /** Format: email */
      email?: string;
      readonly name?: string;
      readonly organization?: {
        /** Format: uuid */
        readonly id?: UUID;
        name: string;
        scope?: string | null;
        readonly is_enterprise?: boolean;
        readonly control_room?: {
          /** Format: uuid */
          readonly id?: UUID;
          /**
           * Format: uri
           * @description The Control Room URL
           */
          url: string;
        };
        readonly theme?: {
          show_sidebar_logo?: boolean;
          /**
           * Format: uri
           * @description The image URL of a custom logo. Image format must be SVG or PNG.
           */
          logo?: string | null;
          /**
           * Format: uri
           * @description The image URL of the icon displayed in the browser toolbar. Image format must be PNG.
           */
          toolbar_icon?: string | null;
        };
      };
      readonly organization_memberships?: {
        /** Format: uuid */
        organization: UUID;
        organization_name: string;
        /** @enum {integer} */
        role: 1 | 2 | 3 | 4 | 5;
        scope: string | null;
        /** @description True if user is a manager of one or more team deployments */
        readonly is_deployment_manager?: boolean;
        control_room: {
          /** Format: uuid */
          readonly id?: UUID;
          /**
           * Format: uri
           * @description The Control Room URL
           */
          url: string;
        };
      }[];
      readonly group_memberships?: {
        /** Format: uuid */
        id: UUID;
        name: string;
      }[];
      readonly partner_principals?: {
        /**
         * Format: int64
         * @description AA unique identifier used to interact with the Control Room user via the AA API
         */
        control_room_user_id: number;
        /** Format: uri */
        readonly control_room_url?: string;
      }[];
      readonly is_onboarded?: boolean;
      readonly milestones?: {
        key: string;
        /** @description Optional additional information to provide context about the Milestone. */
        metadata?: {
          [key: string]: unknown;
        } | null;
      }[];
      /** @description True if the account is an organization API service account */
      service_account?: boolean;
      /** @description True if the account is an organization API deployment key account */
      deployment_key_account?: boolean;
      /** @description True if the account is an automated/manual test account */
      test_account?: boolean;
      readonly partner?: {
        /** Format: uuid */
        readonly id?: UUID;
        name: string;
        readonly theme?: string;
        /** Format: uri */
        documentation_url?: string | null;
      };
      readonly enforce_update_millis?: number;
    };
    AuthToken: {
      readonly token?: string;
    };
    Membership: {
      readonly id?: number;
      readonly user?: {
        /** Format: uuid */
        readonly id?: UUID;
        readonly name?: string;
        /** Format: email */
        email?: string;
        readonly service_account?: boolean;
        readonly deployment_key_account?: boolean;
        /** Format: date-time */
        date_joined?: Timestamp;
      };
      /** @enum {integer} */
      role: 1 | 2 | 3 | 4 | 5;
      readonly groups?: {
        /** Format: uuid */
        readonly id?: UUID;
        name: string;
        readonly num_members?: number;
        /** Format: date-time */
        readonly created_at?: Timestamp;
      }[];
    };
    Organization: {
      /** Format: uuid */
      readonly id?: UUID;
      name: string;
      readonly members?: {
        readonly id?: number;
        readonly user?: {
          /** Format: uuid */
          readonly id?: UUID;
          readonly name?: string;
          /** Format: email */
          email?: string;
          readonly service_account?: boolean;
          readonly deployment_key_account?: boolean;
          /** Format: date-time */
          date_joined?: Timestamp;
        };
        /** @enum {integer} */
        role: 1 | 2 | 3 | 4 | 5;
        groups?: {
          /** Format: uuid */
          id: UUID;
          name: string;
        }[];
      }[];
      scope?: string | null;
      /** @enum {integer} */
      default_role?: 1 | 2 | 3 | 4 | 5;
      partner?: string;
      /** @description The number of milliseconds restricted team members have to apply manual deployments or browser extension update. */
      enforce_update_millis?: number | null;
      theme?: {
        show_sidebar_logo?: boolean;
        /**
         * Format: uri
         * @description The image URL of a custom logo. Image format must be SVG or PNG.
         */
        logo?: string | null;
        /**
         * Format: uri
         * @description The image URL of the icon displayed in the browser toolbar. Image format must be PNG.
         */
        toolbar_icon?: string | null;
      };
      /**
       * Format: date-time
       * @description Timestamp when the Business Plan trial ends. None if not on trial.
       */
      trial_end_timestamp?: Timestamp | null;
    };
    UserDetail: {
      /** Format: uuid */
      readonly id?: UUID;
      readonly name?: string;
      /** Format: email */
      email?: string;
      groups: {
        /** Format: uuid */
        readonly id?: UUID;
        group_id: string;
        group_name: string;
        /** Format: date-time */
        readonly created_at?: Timestamp;
      }[];
      /** Format: date-time */
      last_login?: Timestamp | null;
      /** Format: date-time */
      date_joined?: Timestamp;
      readonly membership?: {
        readonly id?: number;
        /** @enum {integer} */
        role: 1 | 2 | 3 | 4 | 5;
      };
    };
    DeploymentKey: {
      /** Format: uuid */
      readonly id?: UUID;
      name: string;
      readonly token?: string;
      /** Format: date-time */
      created_at?: Timestamp;
    };
    Group: {
      /** Format: uuid */
      readonly id?: UUID;
      name: string;
      readonly num_members?: number;
      /** Format: date-time */
      readonly created_at?: Timestamp;
    };
    ServiceAuthMeta: {
      /** Format: uuid */
      readonly id?: UUID;
      label?: string | null;
      service_id: string;
      service_name: string;
    };
    DatabaseSchema: {
      readonly database_id?: string;
      schema_text: string;
    };
    DatabaseRecordsArchive: {
      /** Format: uuid */
      readonly id?: UUID;
      database: {
        /** Format: uuid */
        readonly id?: UUID;
        name: string;
      };
      /** Format: date */
      date: string;
      /** Format: binary */
      file: string;
      /** Format: date-time */
      readonly created_at?: Timestamp;
      /** Format: date-time */
      readonly updated_at?: Timestamp;
    };
    Subscription: {
      /** Format: uuid */
      readonly id?: UUID;
      name: string;
      concurrent?: boolean;
      /** Format: decimal */
      seat_price_usd: string;
      seat_session_hours?: number;
      /** Format: date-time */
      readonly created_at?: Timestamp;
      /** Format: date-time */
      readonly updated_at?: Timestamp;
      readonly utilization?: string;
    };
    EventInterval: {
      /** Format: uuid */
      deployment_id: UUID;
      end_timestamp: number;
      event_count: number;
    };
    OrganizationContact: {
      /** Format: uuid */
      id?: UUID;
      /** Format: email */
      email: string;
      /** @description Notify when a new user joins your organization */
      notify_install?: boolean;
      /** @description Notify when a deployment has new errors */
      notify_error?: boolean;
      /** Format: date-time */
      readonly created_at?: Timestamp;
      /** Format: date-time */
      readonly updated_at?: Timestamp;
    };
    OrganizationAuthUrlPattern: {
      /** @description A chrome-style url match pattern, see https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns */
      url_pattern: string;
    };
    OrganizationTheme: {
      show_sidebar_logo?: boolean;
      /**
       * Format: uri
       * @description The image URL of a custom logo. Image format must be SVG or PNG.
       */
      logo?: string | null;
      /**
       * Format: uri
       * @description The image URL of the icon displayed in the browser toolbar. Image format must be PNG.
       */
      toolbar_icon?: string | null;
    };
    ControlRoom: {
      /** Format: uuid */
      readonly id?: UUID;
      /**
       * Format: uri
       * @description The Control Room URL
       */
      url: string;
    };
    ControlRoomConfiguration: {
      /** Format: uuid */
      readonly id?: UUID;
      /**
       * Format: uri
       * @description The Control Room URL
       */
      url: string;
      service_account_username: string;
      service_account_key: string;
      organization: string;
    };
    SanitizedAuth: {
      /** Format: uuid */
      readonly id?: UUID;
      label: string | null;
      organization: {
        /** Format: uuid */
        readonly id?: UUID;
        name: string;
      };
      /** Format: uuid */
      readonly user?: UUID;
      service: {
        /**
         * Format: uuid
         * @description Surrogate primary key
         */
        readonly id?: UUID;
        /** @description Unique package identifier, including the scope and collection */
        name: string;
        config: {
          [key: string]: unknown;
        };
      };
      readonly config?: string;
      /** @description True to push down configuration secrets to the client */
      pushdown?: boolean;
      readonly editable?: string;
    };
    EditableAuth: {
      /** Format: uuid */
      readonly id?: UUID;
      label?: string | null;
      organization?: string | null;
      config: {
        [key: string]: unknown;
      };
      /** Format: date-time */
      readonly created_at?: Timestamp;
      service: string;
      /** Format: date-time */
      readonly updated_at?: Timestamp;
      /** @description True to push down configuration secrets to the client */
      pushdown?: boolean;
      readonly editable?: string;
    };
    Settings: {
      scope?: string | null;
    };
    SupportUserDetail: {
      /** Format: uuid */
      readonly id?: UUID;
      readonly name?: string;
      /** Format: email */
      email?: string;
      readonly service_account?: boolean;
      readonly deployment_key_account?: boolean;
      /** Format: date-time */
      date_joined?: Timestamp;
      /** @description Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. */
      username: string;
      organizations: {
        /** Format: uuid */
        readonly id?: UUID;
        name: string;
      }[];
      /**
       * Format: int64
       * @description If available, the Pipedrive Person ID associated with this user.
       */
      pipedrive_person_id?: number | null;
    };
    SupportUserEvent: {
      name: string;
      /** Format: date-time */
      time: Timestamp;
      id: string;
      blueprintId?: string;
      blueprintVersion?: string;
      extensionPointId?: string;
      label?: string;
    };
    UserErrorItem: {
      /** @description Label of the extension, depends on the extension's telemetry settings */
      extension_label?: string | null;
      readonly id?: number;
      /** @description Just the error message, not the complete traceback */
      message: string;
      /** @description Step of the extension, depends on the extension's telemetry settings */
      step_label?: string | null;
      /**
       * Format: date-time
       * @description Timestamp the error occurred, not the time the record is added to the db
       */
      timestamp: Timestamp;
    };
    PublicBlueprintErrorItemGroup: {
      blueprint_name: string;
      blueprint_version: string;
      extension_label: string | null;
      step_label: string | null;
      brick_version: string | null;
      message: string;
      occurrence_count: number;
      users: {
        /** Format: uuid */
        id: UUID;
        email: string;
      }[];
      /** Format: date-time */
      last_occurrence_timestamp: Timestamp;
      user_agent_extension_versions: string[];
      request_urls: string[];
    };
    ErrorItem: {
      /** Format: uuid */
      uuid: UUID;
      /** @description JavaScript error class name */
      class_name: string;
      /** @description Just the error message, not the complete traceback */
      message: string;
      /** @description True if the extension author/maintainer can't fix the error on their own */
      is_application_error: boolean;
      /**
       * Format: date-time
       * @description Timestamp the error occurred, not the time the record is added to the db
       */
      timestamp: Timestamp;
      readonly user?: {
        /** Format: uuid */
        readonly id?: UUID;
        readonly name?: string;
        /** Format: email */
        email?: string;
        readonly service_account?: boolean;
        readonly deployment_key_account?: boolean;
        /** Format: date-time */
        date_joined?: Timestamp;
      };
      organization?: string | null;
      deployment?: string | null;
      blueprint_version?: {
        id: string;
        version: string;
      };
      brick_version?: {
        id: string;
        version: string;
      };
      service_version?: {
        id: string;
        version: string;
      };
      readonly user_extension?: {
        /** Format: uuid */
        id: UUID;
        /** Format: date-time */
        createTimestamp: Timestamp;
        /** Format: date-time */
        updateTimestamp: Timestamp;
      };
      /**
       * Format: uuid
       * @description UUID of the user-defined extension, not the Pixiebrix extension. Same value as UserExtension.extension_id
       */
      extension_uuid: UUID;
      /** @description Label of the extension, depends on the extension's telemetry settings */
      extension_label?: string | null;
      /** @description Step of the extension, depends on the extension's telemetry settings */
      step_label?: string | null;
      user_agent: string;
      /** @description Browser extension semantic version */
      user_agent_extension_version: string;
      error_data?: {
        [key: string]: unknown;
      } | null;
    };
    CypressConstants: {
      TEST_CONTROL_ROOM_1: {
        index: number;
        url: string;
        database_url: string;
        service_account_username: string;
        service_account_api_key: string;
        version?: string;
      };
      TEST_CONTROL_ROOM_2: {
        index: number;
        url: string;
        database_url: string;
        service_account_username: string;
        service_account_api_key: string;
        version?: string;
      };
    };
    DatabaseExportRequest: {
      name: string;
      databases: UUID[];
      /**
       * @default application/json
       * @enum {string}
       */
      media_type: "application/xlsx" | "application/json" | "text/csv";
      /** @default {} */
      filters: {
        [key: string]: unknown;
      };
    };
    DeploymentMessage: {
      /** Format: email */
      recipient: string;
      subject: string;
      message: string;
    };
    EventList: {
      events?: {
        data?: {
          [key: string]: unknown;
        };
        uid?: string;
        event?: string;
      }[];
      /** Format: date-time */
      timestamp?: Timestamp;
    };
    Identify: {
      uid?: string;
      data?: {
        [key: string]: unknown;
      };
    };
    Milestone: {
      key: string;
      /** @description Optional additional information to provide context about the Milestone. */
      metadata?: {
        [key: string]: unknown;
      } | null;
    };
    Onboarding: Record<string, never>;
    ProvisionedAccount: {
      /** Format: email */
      email: string;
      first_name?: string;
      last_name?: string;
    };
    ProxiedRequest: {
      /** @description An absolute/relative URL for the request */
      url: string;
      /** @description The search params for the request */
      params?: {
        [key: string]: unknown;
      };
      /** @description The headers for the request */
      headers?: {
        [key: string]: unknown;
      };
      /**
       * @description The HTTP method for the request
       * @default GET
       * @enum {string}
       */
      method:
        | "GET"
        | "POST"
        | "PUT"
        | "PATCH"
        | "DELETE"
        | "get"
        | "post"
        | "put"
        | "patch"
        | "delete";
      /** @description The application/json body of the request */
      data?: {
        [key: string]: unknown;
      };
      /** @description The id of the service to authenticate the request */
      service_id?: string;
      /** @description The id of the credential to authenticate the request */
      auth_id: string;
    };
    ExternalEvent: {
      /** Format: email */
      email: string;
      data?: {
        [key: string]: unknown;
      };
      event: string;
    };
    SeedCypress: {
      users: {
        /** Format: email */
        email?: string;
        readonly pending_invitations?: string[];
        scope?: string | null;
      }[];
    };
    PackageVersionDeprecated: {
      /** Format: uuid */
      readonly id?: UUID;
      readonly version?: string;
      config: {
        [key: string]: unknown;
      };
      raw_config?: string;
      /** Format: date-time */
      readonly created_at?: Timestamp;
      /** Format: date-time */
      updated_at?: Timestamp;
    };
    MeV1_0: {
      readonly flags?: string[];
      /** Format: uuid */
      readonly id?: UUID;
      scope?: string | null;
      /** Format: email */
      email?: string;
      readonly name?: string;
      readonly organization?: {
        /** Format: uuid */
        readonly id?: UUID;
        name: string;
        scope?: string | null;
        readonly is_enterprise?: boolean;
        readonly control_room?: {
          /** Format: uuid */
          readonly id?: UUID;
          /**
           * Format: uri
           * @description The Control Room URL
           */
          url: string;
        };
        readonly theme?: {
          show_sidebar_logo?: boolean;
          /**
           * Format: uri
           * @description The image URL of a custom logo. Image format must be SVG or PNG.
           */
          logo?: string | null;
          /**
           * Format: uri
           * @description The image URL of the icon displayed in the browser toolbar. Image format must be PNG.
           */
          toolbar_icon?: string | null;
        };
      };
      readonly organization_memberships?: {
        /** Format: uuid */
        organization: UUID;
        organization_name: string;
        /** @enum {integer} */
        role: 1 | 2 | 3 | 4 | 5;
        scope: string | null;
        /** @description True if user is a manager of one or more team deployments */
        readonly is_deployment_manager?: boolean;
        control_room: {
          /** Format: uuid */
          readonly id?: UUID;
          /**
           * Format: uri
           * @description The Control Room URL
           */
          url: string;
        };
      }[];
      readonly group_memberships?: {
        /** Format: uuid */
        id: UUID;
        name: string;
      }[];
      readonly partner_principals?: {
        /**
         * Format: int64
         * @description AA unique identifier used to interact with the Control Room user via the AA API
         */
        control_room_user_id: number;
        /** Format: uri */
        readonly control_room_url?: string;
      }[];
      readonly is_onboarded?: boolean;
      readonly milestones?: {
        key: string;
        /** @description Optional additional information to provide context about the Milestone. */
        metadata?: {
          [key: string]: unknown;
        } | null;
      }[];
      /** @description True if the account is an organization API service account */
      service_account?: boolean;
      /** @description True if the account is an organization API deployment key account */
      deployment_key_account?: boolean;
      /** @description True if the account is an automated/manual test account */
      test_account?: boolean;
      readonly partner?: {
        /** Format: uuid */
        readonly id?: UUID;
        name: string;
        readonly theme?: string;
        /** Format: uri */
        documentation_url?: string | null;
      };
      readonly enforce_update_millis?: number;
      readonly telemetry_organization?: {
        /** Format: uuid */
        readonly id?: UUID;
        name: string;
        scope?: string | null;
        readonly is_enterprise?: boolean;
        readonly control_room?: {
          /** Format: uuid */
          readonly id?: UUID;
          /**
           * Format: uri
           * @description The Control Room URL
           */
          url: string;
        };
        readonly theme?: {
          show_sidebar_logo?: boolean;
          /**
           * Format: uri
           * @description The image URL of a custom logo. Image format must be SVG or PNG.
           */
          logo?: string | null;
          /**
           * Format: uri
           * @description The image URL of the icon displayed in the browser toolbar. Image format must be PNG.
           */
          toolbar_icon?: string | null;
        };
      };
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  listAuditEvents: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/audit/organizations/{id}/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/audit/organizations/{id}/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/audit/organizations/{id}/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/audit/organizations/{id}/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["AuditEvent"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["AuditEvent"][];
        };
      };
    };
  };
  listAuditGroups: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/audit/groups/{id}/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/audit/groups/{id}/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/audit/groups/{id}/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/audit/groups/{id}/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["AuditEvent"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["AuditEvent"][];
        };
      };
    };
  };
  listAuditDeployments: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/audit/deployments/{id}/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/audit/deployments/{id}/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/audit/deployments/{id}/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/audit/deployments/{id}/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["AuditEvent"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["AuditEvent"][];
        };
      };
    };
  };
  listRegistryBricks: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
        /** @description header */
        header?: string;
        /** @description kind */
        kind?: 1 | 2 | 3 | 4 | 5;
        /** @description kind__in */
        kind__in?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/registry/bricks/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/registry/bricks/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/registry/bricks/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/registry/bricks/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["PackageConfigList"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["PackageConfigList"][];
        };
      };
    };
  };
  retrieveRegistryBricks: {
    parameters: {
      query?: {
        /** @description header */
        header?: string;
        /** @description kind */
        kind?: 1 | 2 | 3 | 4 | 5;
        /** @description kind__in */
        kind__in?: string;
      };
      header?: never;
      path: {
        name: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["PackageConfig"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["PackageConfig"];
        };
      };
    };
  };
  retrievePackageQueryResult: {
    parameters: {
      query?: {
        /** @description The JsonPath to filter Packages and UserExtension */
        jsonpath?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["PackageQueryResult"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["PackageQueryResult"];
        };
      };
    };
  };
  retrieveRecipes: {
    parameters: {
      query?: {
        /** @description header */
        header?: string;
        /** @description kind */
        kind?: 1 | 2 | 3 | 4 | 5;
        /** @description kind__in */
        kind__in?: string;
      };
      header?: never;
      path: {
        name: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["PackageConfig"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["PackageConfig"];
        };
      };
    };
  };
  listServices: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
        /** @description header */
        header?: string;
        /** @description kind */
        kind?: 1 | 2 | 3 | 4 | 5;
        /** @description kind__in */
        kind__in?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/services/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/services/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/services/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/services/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["PackageConfigList"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["PackageConfigList"][];
        };
      };
    };
  };
  listPackageMeta: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
        /** @description A search term. */
        q?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/bricks/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/bricks/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/bricks/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/bricks/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["PackageMeta"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["PackageMeta"][];
        };
      };
    };
  };
  createPackage: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Package"];
        "application/x-www-form-urlencoded": components["schemas"]["Package"];
        "multipart/form-data": components["schemas"]["Package"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Package"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Package"];
        };
      };
    };
  };
  retrievePackage: {
    parameters: {
      query?: {
        /** @description A search term. */
        q?: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Package"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Package"];
        };
      };
    };
  };
  updatePackage: {
    parameters: {
      query?: {
        /** @description A search term. */
        q?: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Package"];
        "application/x-www-form-urlencoded": components["schemas"]["Package"];
        "multipart/form-data": components["schemas"]["Package"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Package"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Package"];
        };
      };
    };
  };
  destroyPackage: {
    parameters: {
      query?: {
        /** @description A search term. */
        q?: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  listPackageVersionSlims: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/bricks/{id}/versions/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/bricks/{id}/versions/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/bricks/{id}/versions/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/bricks/{id}/versions/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["PackageVersionSlim"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["PackageVersionSlim"][];
        };
      };
    };
  };
  listUserDatabases: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/databases/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/databases/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/databases/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/databases/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Database"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Database"][];
        };
      };
    };
  };
  createUserDatabase: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Database"];
        "application/x-www-form-urlencoded": components["schemas"]["Database"];
        "multipart/form-data": components["schemas"]["Database"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Database"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Database"];
        };
      };
    };
  };
  retrieveDatabaseExportJob: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description A UUID string identifying this database export job. */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["DatabaseExportJob"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["DatabaseExportJob"];
        };
      };
    };
  };
  retrieveUserDatabase: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Database"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Database"];
        };
      };
    };
  };
  destroyUserDatabase: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  updateUserDatabase: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Database"];
        "application/x-www-form-urlencoded": components["schemas"]["Database"];
        "multipart/form-data": components["schemas"]["Database"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Database"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Database"];
        };
      };
    };
  };
  retrieveUserDatabasePermission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["UserDatabasePermission"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["UserDatabasePermission"];
        };
      };
    };
  };
  listRecords: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        database_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/databases/{database_pk}/records/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/databases/{database_pk}/records/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/databases/{database_pk}/records/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/databases/{database_pk}/records/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Record"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Record"][];
          "text/csv; version=2.0": components["schemas"]["Record"][];
          "application/vnd.pixiebrix.api.flat+json; version=2.0": components["schemas"]["Record"][];
        };
      };
    };
  };
  updateRecord: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        database_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Record"];
        "application/x-www-form-urlencoded": components["schemas"]["Record"];
        "multipart/form-data": components["schemas"]["Record"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Record"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Record"];
          "text/csv; version=2.0": components["schemas"]["Record"];
          "application/vnd.pixiebrix.api.flat+json; version=2.0": components["schemas"]["Record"];
        };
      };
    };
  };
  createRecord: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        database_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Record"];
        "application/x-www-form-urlencoded": components["schemas"]["Record"];
        "multipart/form-data": components["schemas"]["Record"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Record"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Record"];
          "text/csv; version=2.0": components["schemas"]["Record"];
          "application/vnd.pixiebrix.api.flat+json; version=2.0": components["schemas"]["Record"];
        };
      };
    };
  };
  clearRecord: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        database_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  retrieveRecordDetail: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        database_pk: string;
        key: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Record"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Record"];
          "text/csv; version=2.0": components["schemas"]["Record"];
          "application/vnd.pixiebrix.api.flat+json; version=2.0": components["schemas"]["Record"];
        };
      };
    };
  };
  updateRecordDetail: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        database_pk: string;
        key: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Record"];
        "application/x-www-form-urlencoded": components["schemas"]["Record"];
        "multipart/form-data": components["schemas"]["Record"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Record"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Record"];
          "text/csv; version=2.0": components["schemas"]["Record"];
          "application/vnd.pixiebrix.api.flat+json; version=2.0": components["schemas"]["Record"];
        };
      };
    };
  };
  destroyRecordDetail: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        database_pk: string;
        key: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  listDatabaseReferences: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        database_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/databases/{database_pk}/references/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/databases/{database_pk}/references/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/databases/{database_pk}/references/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/databases/{database_pk}/references/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["PackageVersionSlim"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["PackageVersionSlim"][];
        };
      };
    };
  };
  listDatabaseDeployments: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        database_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/databases/{database_pk}/deployments/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/databases/{database_pk}/deployments/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/databases/{database_pk}/deployments/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/databases/{database_pk}/deployments/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Deployment"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Deployment"][];
        };
      };
    };
  };
  listCampaigns: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/campaigns/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/campaigns/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/campaigns/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/campaigns/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Campaign"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Campaign"][];
        };
      };
    };
  };
  createCampaign: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Campaign"];
        "application/x-www-form-urlencoded": components["schemas"]["Campaign"];
        "multipart/form-data": components["schemas"]["Campaign"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Campaign"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Campaign"];
        };
      };
    };
  };
  retrieveCampaign: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Campaign"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Campaign"];
        };
      };
    };
  };
  destroyCampaign: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  partialUpdateCampaign: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Campaign"];
        "application/x-www-form-urlencoded": components["schemas"]["Campaign"];
        "multipart/form-data": components["schemas"]["Campaign"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Campaign"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Campaign"];
        };
      };
    };
  };
  retrieveCampaignEngagementJob: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        campaign_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["Job"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["Job"];
        };
      };
    };
  };
  listCampaignDatabases: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        campaign_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/campaigns/{campaign_pk}/databases/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/campaigns/{campaign_pk}/databases/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/campaigns/{campaign_pk}/databases/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/campaigns/{campaign_pk}/databases/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["CampaignDatabase"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["CampaignDatabase"][];
        };
      };
    };
  };
  listCampaignMembers: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        organization_pk: string;
        campaign_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/campaigns/{campaign_pk}/members/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/campaigns/{campaign_pk}/members/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/campaigns/{campaign_pk}/members/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/campaigns/{campaign_pk}/members/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["CampaignMember"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["CampaignMember"][];
        };
      };
    };
  };
  updateCampaignMember: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
        campaign_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["CampaignMember"];
        "application/x-www-form-urlencoded": components["schemas"]["CampaignMember"];
        "multipart/form-data": components["schemas"]["CampaignMember"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["CampaignMember"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["CampaignMember"];
        };
      };
    };
  };
  createCampaignMember: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
        campaign_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["CampaignMember"];
        "application/x-www-form-urlencoded": components["schemas"]["CampaignMember"];
        "multipart/form-data": components["schemas"]["CampaignMember"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["CampaignMember"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["CampaignMember"];
        };
      };
    };
  };
  listUserDeploymentDetails: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/deployments/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/deployments/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/deployments/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/deployments/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["DeploymentDetail"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["DeploymentDetail"][];
        };
      };
    };
  };
  telemetryListUserDeploymentDetail: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["DeploymentTelemetry"];
        "application/x-www-form-urlencoded": components["schemas"]["DeploymentTelemetry"];
        "multipart/form-data": components["schemas"]["DeploymentTelemetry"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["DeploymentDetail"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["DeploymentDetail"];
        };
      };
    };
  };
  retrieveDeploymentDetail: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["DeploymentDetail"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["DeploymentDetail"];
        };
      };
    };
  };
  updateDeploymentDetail: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["DeploymentDetail"];
        "application/x-www-form-urlencoded": components["schemas"]["DeploymentDetail"];
        "multipart/form-data": components["schemas"]["DeploymentDetail"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["DeploymentDetail"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["DeploymentDetail"];
        };
      };
    };
  };
  destroyDeploymentDetail: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  partialUpdateDeploymentDetail: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["DeploymentDetail"];
        "application/x-www-form-urlencoded": components["schemas"]["DeploymentDetail"];
        "multipart/form-data": components["schemas"]["DeploymentDetail"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["DeploymentDetail"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["DeploymentDetail"];
        };
      };
    };
  };
  retrieveDeploymentDependencies: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["DependencyTree"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["DependencyTree"];
        };
      };
    };
  };
  listDeploymentReportMetadata: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["DeploymentReportMetadata"][];
          "text/csv; version=1.0": components["schemas"]["DeploymentReportMetadata"][];
        };
      };
    };
  };
  retrieveDeploymentReport: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["DeploymentReport"];
          "text/csv; version=1.0": components["schemas"]["DeploymentReport"];
        };
      };
    };
  };
  retrieveDeploymentReportJob: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
        report_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["Job"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["Job"];
        };
      };
    };
  };
  listActiveDeployments: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        deployment_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/deployments/{deployment_pk}/users/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/deployments/{deployment_pk}/users/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/deployments/{deployment_pk}/users/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/deployments/{deployment_pk}/users/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["ActiveDeployment"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["ActiveDeployment"][];
        };
      };
    };
  };
  listDeploymentErrors: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["ErrorItemGroup"][];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["ErrorItemGroup"][];
        };
      };
    };
  };
  destroyDeploymentErrors: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  listDeploymentPermissions: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        deployment_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/deployments/{deployment_pk}/groups/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/deployments/{deployment_pk}/groups/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/deployments/{deployment_pk}/groups/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/deployments/{deployment_pk}/groups/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["DeploymentPermission"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["DeploymentPermission"][];
        };
      };
    };
  };
  createDeploymentPermission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["DeploymentPermission"];
        "application/x-www-form-urlencoded": components["schemas"]["DeploymentPermission"];
        "multipart/form-data": components["schemas"]["DeploymentPermission"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["DeploymentPermission"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["DeploymentPermission"];
        };
      };
    };
  };
  listDeploymentManagerPermissions: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        deployment_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/deployments/{deployment_pk}/managers/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/deployments/{deployment_pk}/managers/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/deployments/{deployment_pk}/managers/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/deployments/{deployment_pk}/managers/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["DeploymentManagerPermission"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["DeploymentManagerPermission"][];
        };
      };
    };
  };
  createDeploymentManagerPermission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["DeploymentManagerPermission"];
        "application/x-www-form-urlencoded": components["schemas"]["DeploymentManagerPermission"];
        "multipart/form-data": components["schemas"]["DeploymentManagerPermission"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["DeploymentManagerPermission"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["DeploymentManagerPermission"];
        };
      };
    };
  };
  listDeploymentAlertEmails: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["DeploymentAlertEmail"][];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["DeploymentAlertEmail"][];
        };
      };
    };
  };
  createDeploymentAlertEmail: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["DeploymentAlertEmail"];
        "application/x-www-form-urlencoded": components["schemas"]["DeploymentAlertEmail"];
        "multipart/form-data": components["schemas"]["DeploymentAlertEmail"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["DeploymentAlertEmail"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["DeploymentAlertEmail"];
        };
      };
    };
  };
  retrieveDeploymentAlertEmail: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["DeploymentAlertEmail"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["DeploymentAlertEmail"];
        };
      };
    };
  };
  updateDeploymentAlertEmail: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["DeploymentAlertEmail"];
        "application/x-www-form-urlencoded": components["schemas"]["DeploymentAlertEmail"];
        "multipart/form-data": components["schemas"]["DeploymentAlertEmail"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["DeploymentAlertEmail"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["DeploymentAlertEmail"];
        };
      };
    };
  };
  destroyDeploymentAlertEmail: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  partialUpdateDeploymentAlertEmail: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["DeploymentAlertEmail"];
        "application/x-www-form-urlencoded": components["schemas"]["DeploymentAlertEmail"];
        "multipart/form-data": components["schemas"]["DeploymentAlertEmail"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["DeploymentAlertEmail"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["DeploymentAlertEmail"];
        };
      };
    };
  };
  listUserExtensions: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": unknown[];
          "application/vnd.pixiebrix.api+json; version=1.0": unknown[];
        };
      };
    };
  };
  retrieveUserExtensionDetail: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": unknown;
          "application/vnd.pixiebrix.api+json; version=1.0": unknown;
        };
      };
    };
  };
  updateUserExtensionDetail: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": unknown;
        "application/x-www-form-urlencoded": unknown;
        "multipart/form-data": unknown;
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": unknown;
          "application/vnd.pixiebrix.api+json; version=1.0": unknown;
        };
      };
    };
  };
  destroyUserExtensionDetail: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  listGroupMemberships: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        group_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/groups/{group_pk}/memberships/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/groups/{group_pk}/memberships/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/groups/{group_pk}/memberships/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/groups/{group_pk}/memberships/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["GroupMembership"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["GroupMembership"][];
        };
      };
    };
  };
  updateGroupMembership: {
    parameters: {
      query?: {
        /** @description Ignore emails that are not associated with a campaign */
        require_campaign?: boolean;
      };
      header?: never;
      path: {
        group_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["GroupMembership"];
        "application/x-www-form-urlencoded": components["schemas"]["GroupMembership"];
        "multipart/form-data": components["schemas"]["GroupMembership"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["GroupMembership"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["GroupMembership"];
        };
      };
    };
  };
  createGroupMembership: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        group_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["GroupMembership"];
        "application/x-www-form-urlencoded": components["schemas"]["GroupMembership"];
        "multipart/form-data": components["schemas"]["GroupMembership"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["GroupMembership"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["GroupMembership"];
        };
      };
    };
  };
  listGroupPackagePermissions: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/groups/{id}/permissions/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/groups/{id}/permissions/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/groups/{id}/permissions/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/groups/{id}/permissions/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["GroupPackagePermission"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["GroupPackagePermission"][];
        };
      };
    };
  };
  createGroupPackagePermission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["GroupPackagePermission"];
        "application/x-www-form-urlencoded": components["schemas"]["GroupPackagePermission"];
        "multipart/form-data": components["schemas"]["GroupPackagePermission"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["GroupPackagePermission"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["GroupPackagePermission"];
        };
      };
    };
  };
  listServiceAuthPermissions: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/groups/{id}/integrations/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/groups/{id}/integrations/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/groups/{id}/integrations/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/groups/{id}/integrations/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["ServiceAuthPermission"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["ServiceAuthPermission"][];
        };
      };
    };
  };
  createServiceAuthPermission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["ServiceAuthPermission"];
        "application/x-www-form-urlencoded": components["schemas"]["ServiceAuthPermission"];
        "multipart/form-data": components["schemas"]["ServiceAuthPermission"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["ServiceAuthPermission"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["ServiceAuthPermission"];
        };
      };
    };
  };
  retrieveServiceAuthPermission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        group_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["ServiceAuthPermission"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["ServiceAuthPermission"];
        };
      };
    };
  };
  updateServiceAuthPermission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        group_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["ServiceAuthPermission"];
        "application/x-www-form-urlencoded": components["schemas"]["ServiceAuthPermission"];
        "multipart/form-data": components["schemas"]["ServiceAuthPermission"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["ServiceAuthPermission"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["ServiceAuthPermission"];
        };
      };
    };
  };
  destroyServiceAuthPermission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        group_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  partialUpdateServiceAuthPermission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        group_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["ServiceAuthPermission"];
        "application/x-www-form-urlencoded": components["schemas"]["ServiceAuthPermission"];
        "multipart/form-data": components["schemas"]["ServiceAuthPermission"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["ServiceAuthPermission"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["ServiceAuthPermission"];
        };
      };
    };
  };
  retrieveGroup: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description A UUID string identifying this group. */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["GroupDetail"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["GroupDetail"];
        };
      };
    };
  };
  updateGroup: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description A UUID string identifying this group. */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["GroupDetail"];
        "application/x-www-form-urlencoded": components["schemas"]["GroupDetail"];
        "multipart/form-data": components["schemas"]["GroupDetail"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["GroupDetail"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["GroupDetail"];
        };
      };
    };
  };
  destroyGroup: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description A UUID string identifying this group. */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  partialUpdateGroup: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description A UUID string identifying this group. */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["GroupDetail"];
        "application/x-www-form-urlencoded": components["schemas"]["GroupDetail"];
        "multipart/form-data": components["schemas"]["GroupDetail"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["GroupDetail"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["GroupDetail"];
        };
      };
    };
  };
  listDatabasePermissions: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        group_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/groups/{group_pk}/databases/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/groups/{group_pk}/databases/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/groups/{group_pk}/databases/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/groups/{group_pk}/databases/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["DatabasePermission"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["DatabasePermission"][];
        };
      };
    };
  };
  createList: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        group_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": unknown;
        "application/x-www-form-urlencoded": unknown;
        "multipart/form-data": unknown;
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": unknown;
          "application/vnd.pixiebrix.api+json; version=2.0": unknown;
        };
      };
    };
  };
  retrieveDatabasePermission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        group_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["DatabasePermission"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["DatabasePermission"];
        };
      };
    };
  };
  destroyDatabasePermission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        group_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  partialUpdateDatabasePermission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        group_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["DatabasePermission"];
        "application/x-www-form-urlencoded": components["schemas"]["DatabasePermission"];
        "multipart/form-data": components["schemas"]["DatabasePermission"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["DatabasePermission"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["DatabasePermission"];
        };
      };
    };
  };
  listMeInvitations: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/invitations/me/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/invitations/me/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/invitations/me/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/invitations/me/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["PendingInvitation"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["PendingInvitation"][];
        };
      };
    };
  };
  listOrganizationInvitations: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/invitations/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/invitations/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/invitations/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/invitations/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["PendingInvitation"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["PendingInvitation"][];
        };
      };
    };
  };
  createOrganizationInvitation: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["PendingInvitation"];
        "application/x-www-form-urlencoded": components["schemas"]["PendingInvitation"];
        "multipart/form-data": components["schemas"]["PendingInvitation"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["PendingInvitation"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["PendingInvitation"];
        };
      };
    };
  };
  loginMagicLink: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": unknown;
          "application/vnd.pixiebrix.api+json; version=1.0": unknown;
        };
      };
    };
  };
  createMagicLink: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": unknown;
        "application/x-www-form-urlencoded": unknown;
        "multipart/form-data": unknown;
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": unknown;
          "application/vnd.pixiebrix.api+json; version=1.0": unknown;
        };
      };
    };
  };
  listMarketplaceListings: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
        /** @description package__name */
        package__name?: string;
        /** @description updated_at__gt */
        updated_at__gt?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/marketplace/listings/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/marketplace/listings/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/marketplace/listings/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/marketplace/listings/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["MarketplaceListing"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["MarketplaceListing"][];
        };
      };
    };
  };
  retrieveMarketplaceListing: {
    parameters: {
      query?: {
        /** @description package__name */
        package__name?: string;
        /** @description updated_at__gt */
        updated_at__gt?: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["MarketplaceListing"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["MarketplaceListing"];
        };
      };
    };
  };
  listTags: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/marketplace/tags/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/marketplace/tags/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/marketplace/tags/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/marketplace/tags/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Tag"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Tag"][];
        };
      };
    };
  };
  retrieveMe: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.1": components["schemas"]["Me"];
          "application/vnd.pixiebrix.api+json; version=1.1": components["schemas"]["Me"];
        };
      };
    };
  };
  destroyMe: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  retrieveAuthToken: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["AuthToken"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["AuthToken"];
        };
      };
    };
  };
  retrieveOrganizationMembership: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description A unique integer value identifying this organization membership. */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["Membership"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["Membership"];
        };
      };
    };
  };
  updateOrganizationMembership: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description A unique integer value identifying this organization membership. */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Membership"];
        "application/x-www-form-urlencoded": components["schemas"]["Membership"];
        "multipart/form-data": components["schemas"]["Membership"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["Membership"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["Membership"];
        };
      };
    };
  };
  destroyOrganizationMembership: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description A unique integer value identifying this organization membership. */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  partialUpdateOrganizationMembership: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description A unique integer value identifying this organization membership. */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Membership"];
        "application/x-www-form-urlencoded": components["schemas"]["Membership"];
        "multipart/form-data": components["schemas"]["Membership"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["Membership"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["Membership"];
        };
      };
    };
  };
  listStarterBlueprints: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["PackageConfigList"][];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["PackageConfigList"][];
        };
      };
    };
  };
  listOrganizations: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/organizations/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/organizations/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/organizations/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/organizations/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Organization"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Organization"][];
        };
      };
    };
  };
  createOrganization: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Organization"];
        "application/x-www-form-urlencoded": components["schemas"]["Organization"];
        "multipart/form-data": components["schemas"]["Organization"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Organization"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Organization"];
        };
      };
    };
  };
  retrieveOrganization: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Organization"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Organization"];
        };
      };
    };
  };
  destroyOrganization: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  partialUpdateOrganization: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Organization"];
        "application/x-www-form-urlencoded": components["schemas"]["Organization"];
        "multipart/form-data": components["schemas"]["Organization"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Organization"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Organization"];
        };
      };
    };
  };
  retrieveUserDetail: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["UserDetail"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["UserDetail"];
        };
      };
    };
  };
  listDeploymentKeys: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/deployment-keys/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/deployment-keys/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/deployment-keys/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/deployment-keys/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["DeploymentKey"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["DeploymentKey"][];
        };
      };
    };
  };
  createDeploymentKey: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["DeploymentKey"];
        "application/x-www-form-urlencoded": components["schemas"]["DeploymentKey"];
        "multipart/form-data": components["schemas"]["DeploymentKey"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["DeploymentKey"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["DeploymentKey"];
        };
      };
    };
  };
  retrieveDeploymentKey: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["DeploymentKey"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["DeploymentKey"];
        };
      };
    };
  };
  destroyDeploymentKey: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  listGroups: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/groups/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/groups/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/groups/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/groups/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Group"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Group"][];
        };
      };
    };
  };
  createGroup: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Group"];
        "application/x-www-form-urlencoded": components["schemas"]["Group"];
        "multipart/form-data": components["schemas"]["Group"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Group"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Group"];
        };
      };
    };
  };
  listDeployments: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/deployments/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/deployments/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/deployments/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/deployments/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Deployment"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Deployment"][];
        };
      };
    };
  };
  createDeployment: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["DeploymentTelemetry"];
        "application/x-www-form-urlencoded": components["schemas"]["DeploymentTelemetry"];
        "multipart/form-data": components["schemas"]["DeploymentTelemetry"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Deployment"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Deployment"];
        };
      };
    };
  };
  listOrganizationBricks: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
        /** @description A search term. */
        q?: string;
      };
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/bricks/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/bricks/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/bricks/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/bricks/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["PackageMeta"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["PackageMeta"][];
        };
      };
    };
  };
  listOrganizationBlueprints: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/blueprints/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/blueprints/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/blueprints/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/blueprints/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["PackageVersionSlim"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["PackageVersionSlim"][];
        };
      };
    };
  };
  listServiceAuthMeta: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
        /** @description A search term. */
        q?: string;
      };
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/integrations/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/integrations/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/integrations/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/integrations/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["ServiceAuthMeta"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["ServiceAuthMeta"][];
        };
      };
    };
  };
  listMemberships: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
        /** @description user__service_account */
        user__service_account?: string;
        /** @description user__deployment_key_account */
        user__deployment_key_account?: string;
        /** @description A search term. */
        q?: string;
      };
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/memberships/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/memberships/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/memberships/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/memberships/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Membership"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Membership"][];
        };
      };
    };
  };
  retrieveDatabase: {
    parameters: {
      query?: {
        /** @description A search term. */
        q?: string;
      };
      header?: never;
      path: {
        organization_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Database"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Database"];
        };
      };
    };
  };
  updateDatabase: {
    parameters: {
      query?: {
        /** @description A search term. */
        q?: string;
      };
      header?: never;
      path: {
        organization_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Database"];
        "application/x-www-form-urlencoded": components["schemas"]["Database"];
        "multipart/form-data": components["schemas"]["Database"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Database"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Database"];
        };
      };
    };
  };
  destroyDatabase: {
    parameters: {
      query?: {
        /** @description A search term. */
        q?: string;
      };
      header?: never;
      path: {
        organization_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  partialUpdateDatabase: {
    parameters: {
      query?: {
        /** @description A search term. */
        q?: string;
      };
      header?: never;
      path: {
        organization_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Database"];
        "application/x-www-form-urlencoded": components["schemas"]["Database"];
        "multipart/form-data": components["schemas"]["Database"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Database"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Database"];
        };
      };
    };
  };
  retrieveDatabaseSchema: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
        database_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["DatabaseSchema"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["DatabaseSchema"];
        };
      };
    };
  };
  updateDatabaseSchema: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
        database_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["DatabaseSchema"];
        "application/x-www-form-urlencoded": components["schemas"]["DatabaseSchema"];
        "multipart/form-data": components["schemas"]["DatabaseSchema"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["DatabaseSchema"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["DatabaseSchema"];
        };
      };
    };
  };
  listDatabaseRecordsArchives: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
        /** @description Which field to use when ordering the results. */
        ordering?: string;
      };
      header?: never;
      path: {
        organization_pk: string;
        database_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/databases/{database_pk}/record-archives/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/databases/{database_pk}/record-archives/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/databases/{database_pk}/record-archives/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/databases/{database_pk}/record-archives/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["DatabaseRecordsArchive"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["DatabaseRecordsArchive"][];
        };
      };
    };
  };
  listDatabases: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
        /** @description A search term. */
        q?: string;
      };
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/databases/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/databases/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/databases/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/databases/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Database"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Database"][];
        };
      };
    };
  };
  createDatabase: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Database"];
        "application/x-www-form-urlencoded": components["schemas"]["Database"];
        "multipart/form-data": components["schemas"]["Database"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["Database"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["Database"];
        };
      };
    };
  };
  listSubscriptions: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["Subscription"][];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["Subscription"][];
        };
      };
    };
  };
  exportOrganizationBackup: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": unknown;
          "application/vnd.pixiebrix.api+json; version=1.0": unknown;
        };
      };
    };
  };
  listOrganizationErrors: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["ErrorItemGroup"][];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["ErrorItemGroup"][];
        };
      };
    };
  };
  listEventIntervals: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["EventInterval"][];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["EventInterval"][];
        };
      };
    };
  };
  listOrganizationContacts: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/contacts/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/contacts/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/contacts/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/organizations/{organization_pk}/contacts/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["OrganizationContact"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["OrganizationContact"][];
        };
      };
    };
  };
  createOrganizationContact: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["OrganizationContact"];
        "application/x-www-form-urlencoded": components["schemas"]["OrganizationContact"];
        "multipart/form-data": components["schemas"]["OrganizationContact"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["OrganizationContact"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["OrganizationContact"];
        };
      };
    };
  };
  retrieveOrganizationContact: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["OrganizationContact"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["OrganizationContact"];
        };
      };
    };
  };
  updateOrganizationContact: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["OrganizationContact"];
        "application/x-www-form-urlencoded": components["schemas"]["OrganizationContact"];
        "multipart/form-data": components["schemas"]["OrganizationContact"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["OrganizationContact"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["OrganizationContact"];
        };
      };
    };
  };
  destroyOrganizationContact: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  partialUpdateOrganizationContact: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["OrganizationContact"];
        "application/x-www-form-urlencoded": components["schemas"]["OrganizationContact"];
        "multipart/form-data": components["schemas"]["OrganizationContact"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["OrganizationContact"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["OrganizationContact"];
        };
      };
    };
  };
  listOrganizationAuthUrlPatterns: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["OrganizationAuthUrlPattern"][];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["OrganizationAuthUrlPattern"][];
        };
      };
    };
  };
  updateList: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": unknown;
        "application/x-www-form-urlencoded": unknown;
        "multipart/form-data": unknown;
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": unknown;
          "application/vnd.pixiebrix.api+json; version=1.0": unknown;
        };
      };
    };
  };
  retrieveOrganizationTheme: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["OrganizationTheme"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["OrganizationTheme"];
        };
      };
    };
  };
  retrieveControlRoom: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["ControlRoom"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["ControlRoom"];
        };
      };
    };
  };
  retrieveControlRoomConfiguration: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description A UUID string identifying this control room. */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["ControlRoomConfiguration"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["ControlRoomConfiguration"];
        };
      };
    };
  };
  destroyControlRoomConfiguration: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description A UUID string identifying this control room. */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  partialUpdateControlRoomConfiguration: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description A UUID string identifying this control room. */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["ControlRoomConfiguration"];
        "application/x-www-form-urlencoded": components["schemas"]["ControlRoomConfiguration"];
        "multipart/form-data": components["schemas"]["ControlRoomConfiguration"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["ControlRoomConfiguration"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["ControlRoomConfiguration"];
        };
      };
    };
  };
  retrieveGroupPackagePermission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["GroupPackagePermission"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["GroupPackagePermission"];
        };
      };
    };
  };
  updateGroupPackagePermission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["GroupPackagePermission"];
        "application/x-www-form-urlencoded": components["schemas"]["GroupPackagePermission"];
        "multipart/form-data": components["schemas"]["GroupPackagePermission"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["GroupPackagePermission"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["GroupPackagePermission"];
        };
      };
    };
  };
  destroyGroupPackagePermission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  partialUpdateGroupPackagePermission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["GroupPackagePermission"];
        "application/x-www-form-urlencoded": components["schemas"]["GroupPackagePermission"];
        "multipart/form-data": components["schemas"]["GroupPackagePermission"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["GroupPackagePermission"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["GroupPackagePermission"];
        };
      };
    };
  };
  listSanitizedAuths: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/services/shared/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/services/shared/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/services/shared/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/services/shared/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["SanitizedAuth"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["SanitizedAuth"][];
        };
      };
    };
  };
  createEditableAuth: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["EditableAuth"];
        "application/x-www-form-urlencoded": components["schemas"]["EditableAuth"];
        "multipart/form-data": components["schemas"]["EditableAuth"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["EditableAuth"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["EditableAuth"];
        };
      };
    };
  };
  retrieveEditableAuth: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["EditableAuth"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["EditableAuth"];
        };
      };
    };
  };
  updateEditableAuth: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["EditableAuth"];
        "application/x-www-form-urlencoded": components["schemas"]["EditableAuth"];
        "multipart/form-data": components["schemas"]["EditableAuth"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["EditableAuth"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["EditableAuth"];
        };
      };
    };
  };
  destroyEditableAuth: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  partialUpdateEditableAuth: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["EditableAuth"];
        "application/x-www-form-urlencoded": components["schemas"]["EditableAuth"];
        "multipart/form-data": components["schemas"]["EditableAuth"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["EditableAuth"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["EditableAuth"];
        };
      };
    };
  };
  retrieveSettings: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["Settings"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["Settings"];
        };
      };
    };
  };
  updateSettings: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Settings"];
        "application/x-www-form-urlencoded": components["schemas"]["Settings"];
        "multipart/form-data": components["schemas"]["Settings"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["Settings"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["Settings"];
        };
      };
    };
  };
  partialUpdateSettings: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Settings"];
        "application/x-www-form-urlencoded": components["schemas"]["Settings"];
        "multipart/form-data": components["schemas"]["Settings"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["Settings"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["Settings"];
        };
      };
    };
  };
  listSupportUsers: {
    parameters: {
      query?: {
        /** @description A page number within the paginated result set. */
        page?: number;
        /** @description Number of results to return per page. */
        page_size?: number;
        /** @description A search term. */
        q?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          /**
           * @description See https://datatracker.ietf.org/doc/html/rfc8288 for more information.
           * @example &lt;https://app.pixiebrix.com/api/support/users/&gt;; rel=&quot;first&quot;, &lt;https://app.pixiebrix.com/api/support/users/?page=3&gt;; rel=&quot;prev&quot;, &lt;https://app.pixiebrix.com/api/support/users/?page=5&gt;; rel=&quot;next&quot;, &lt;https://app.pixiebrix.com/api/support/users/?page=11&gt;; rel=&quot;last&quot;
           */
          Link?: unknown;
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["SupportUserDetail"][];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["SupportUserDetail"][];
        };
      };
    };
  };
  retrieveSupportUsers: {
    parameters: {
      query?: {
        /** @description A search term. */
        q?: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["SupportUserDetail"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["SupportUserDetail"];
        };
      };
    };
  };
  retrieveSupportUserEvents: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        user_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["SupportUserEvent"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["SupportUserEvent"];
        };
      };
    };
  };
  listUserErrors: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        user_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["UserErrorItem"][];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["UserErrorItem"][];
        };
      };
    };
  };
  listSupportUserBricks: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        user_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["Package"][];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["Package"][];
        };
      };
    };
  };
  retrieveSupportUserBricks: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        user_pk: string;
        brick_pk: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["Package"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["Package"];
        };
      };
    };
  };
  listIntercoms: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": unknown[];
          "application/vnd.pixiebrix.api+json; version=1.0": unknown[];
        };
      };
    };
  };
  listPublicBlueprintErrorItemGroups: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["PublicBlueprintErrorItemGroup"][];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["PublicBlueprintErrorItemGroup"][];
        };
      };
    };
  };
  retrieveErrorDetail: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description A unique integer value identifying this error item. */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["ErrorItem"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["ErrorItem"];
        };
      };
    };
  };
  listCypressConstants: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["CypressConstants"][];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["CypressConstants"][];
        };
      };
    };
  };
  createPackageVersionUpdates: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": unknown;
        "application/x-www-form-urlencoded": unknown;
        "multipart/form-data": unknown;
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": unknown;
          "application/vnd.pixiebrix.api+json; version=1.0": unknown;
        };
      };
    };
  };
  createDatabaseExportJob: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["DatabaseExportRequest"];
        "application/x-www-form-urlencoded": components["schemas"]["DatabaseExportRequest"];
        "multipart/form-data": components["schemas"]["DatabaseExportRequest"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["DatabaseExportRequest"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["DatabaseExportRequest"];
        };
      };
    };
  };
  createQueueAssign: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        database_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": unknown;
        "application/x-www-form-urlencoded": unknown;
        "multipart/form-data": unknown;
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": unknown;
          "application/vnd.pixiebrix.api+json; version=1.0": unknown;
        };
      };
    };
  };
  createCampaignEngagementJob: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        campaign_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Job"];
        "application/x-www-form-urlencoded": components["schemas"]["Job"];
        "multipart/form-data": components["schemas"]["Job"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["Job"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["Job"];
        };
      };
    };
  };
  createCampaignEmailJob: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        campaign_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": unknown;
        "application/x-www-form-urlencoded": unknown;
        "multipart/form-data": unknown;
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": unknown;
          "application/vnd.pixiebrix.api+json; version=1.0": unknown;
        };
      };
    };
  };
  createDeploymentMessage: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["DeploymentMessage"];
        "application/x-www-form-urlencoded": components["schemas"]["DeploymentMessage"];
        "multipart/form-data": components["schemas"]["DeploymentMessage"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["DeploymentMessage"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["DeploymentMessage"];
        };
      };
    };
  };
  createDeploymentReportJob: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
        report_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Job"];
        "application/x-www-form-urlencoded": components["schemas"]["Job"];
        "multipart/form-data": components["schemas"]["Job"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["Job"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["Job"];
        };
      };
    };
  };
  createDeploymentAlert: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": unknown;
        "application/x-www-form-urlencoded": unknown;
        "multipart/form-data": unknown;
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": unknown;
          "application/vnd.pixiebrix.api+json; version=1.0": unknown;
        };
      };
    };
  };
  createEventList: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["EventList"];
        "application/x-www-form-urlencoded": components["schemas"]["EventList"];
        "multipart/form-data": components["schemas"]["EventList"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["EventList"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["EventList"];
        };
      };
    };
  };
  createIdentify: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Identify"];
        "application/x-www-form-urlencoded": components["schemas"]["Identify"];
        "multipart/form-data": components["schemas"]["Identify"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["Identify"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["Identify"];
        };
      };
    };
  };
  acceptMeInvitation: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["PendingInvitation"];
        "application/x-www-form-urlencoded": components["schemas"]["PendingInvitation"];
        "multipart/form-data": components["schemas"]["PendingInvitation"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["PendingInvitation"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["PendingInvitation"];
        };
      };
    };
  };
  rejectMeInvitation: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["PendingInvitation"];
        "application/x-www-form-urlencoded": components["schemas"]["PendingInvitation"];
        "multipart/form-data": components["schemas"]["PendingInvitation"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=2.0": components["schemas"]["PendingInvitation"];
          "application/vnd.pixiebrix.api+json; version=2.0": components["schemas"]["PendingInvitation"];
        };
      };
    };
  };
  createMilestone: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Milestone"];
        "application/x-www-form-urlencoded": components["schemas"]["Milestone"];
        "multipart/form-data": components["schemas"]["Milestone"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["Milestone"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["Milestone"];
        };
      };
    };
  };
  createOnboarding: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Onboarding"];
        "application/x-www-form-urlencoded": components["schemas"]["Onboarding"];
        "multipart/form-data": components["schemas"]["Onboarding"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["Onboarding"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["Onboarding"];
        };
      };
    };
  };
  createProvisionedAccount: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
      };
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["ProvisionedAccount"];
        "application/x-www-form-urlencoded": components["schemas"]["ProvisionedAccount"];
        "multipart/form-data": components["schemas"]["ProvisionedAccount"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["ProvisionedAccount"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["ProvisionedAccount"];
        };
      };
    };
  };
  createControlRoomConfiguration: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["ControlRoomConfiguration"];
        "application/x-www-form-urlencoded": components["schemas"]["ControlRoomConfiguration"];
        "multipart/form-data": components["schemas"]["ControlRoomConfiguration"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["ControlRoomConfiguration"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["ControlRoomConfiguration"];
        };
      };
    };
  };
  createProxiedRequest: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["ProxiedRequest"];
        "application/x-www-form-urlencoded": components["schemas"]["ProxiedRequest"];
        "multipart/form-data": components["schemas"]["ProxiedRequest"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["ProxiedRequest"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["ProxiedRequest"];
        };
      };
    };
  };
  createErrorItem: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["ErrorItem"];
        "application/x-www-form-urlencoded": components["schemas"]["ErrorItem"];
        "multipart/form-data": components["schemas"]["ErrorItem"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["ErrorItem"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["ErrorItem"];
        };
      };
    };
  };
  createExternalEvent: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["ExternalEvent"];
        "application/x-www-form-urlencoded": components["schemas"]["ExternalEvent"];
        "multipart/form-data": components["schemas"]["ExternalEvent"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["ExternalEvent"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["ExternalEvent"];
        };
      };
    };
  };
  createSeedCypress: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["SeedCypress"];
        "application/x-www-form-urlencoded": components["schemas"]["SeedCypress"];
        "multipart/form-data": components["schemas"]["SeedCypress"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json; version=1.0": components["schemas"]["SeedCypress"];
          "application/vnd.pixiebrix.api+json; version=1.0": components["schemas"]["SeedCypress"];
        };
      };
    };
  };
  destroyDeploymentPermission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  destroyDeploymentManagerPermission: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        deployment_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  destroyGroupMembership: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        group_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  destroyOrganizationInvitation: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        organization_pk: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  destroyDeleteTestSocialAccount: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  destroyDeleteRainforestAccount: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
}
