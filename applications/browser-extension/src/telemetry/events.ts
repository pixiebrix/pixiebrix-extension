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

export const Events = {
  ACTIVATION_INTEGRATION_ADD_NEW_CLICK: "AuthWidgetShowAddNew",
  ACTIVATION_INTEGRATION_ADD_NEW_CLOSE: "AuthWidgetHideAddNew",
  ACTIVATION_INTEGRATION_CONFIG_SELECT: "AuthWidgetSelect",
  ACTIVATION_INTEGRATION_REFRESH: "AuthWidgetRefresh",

  BRICK_ADD: "BrickAdd",
  BRICK_COMMENTS_UPDATE: "BrickCommentsUpdate",

  BROWSER_ACTION_RESTRICTED_URL: "BrowserActionRestrictedUrl",

  BUTTON_CLICK: "MenuItemClick",

  CUSTOM_USER_EVENT: "CustomUserEvent",

  DATA_PANEL_TAB_VIEW: "DataPanelTabView",

  DEPLOYMENT_ACTIVATE: "DeploymentActivate",
  DEPLOYMENT_DEACTIVATE_ALL: "DeploymentDeactivateAll",
  DEPLOYMENT_DEACTIVATE_UNASSIGNED: "DeploymentDeactivateUnassigned",
  DEPLOYMENT_LIST: "DeploymentList",
  DEPLOYMENT_REJECT_PERMISSIONS: "DeploymentRejectPermissions",
  DEPLOYMENT_REJECT_VERSION: "DeploymentRejectVersion",
  DEPLOYMENT_SYNC: "DeploymentSync",
  DEPLOYMENT_UPDATE_LIST: "DeploymentUpdateList",

  DEVTOOLS_CLOSE: "DevToolsClose",
  DEVTOOLS_OPEN: "DevToolsOpen",

  EXTENSION_CONSOLE_MOD_ACTIVATE: "MarketplaceActivate",

  FACTORY_RESET: "FactoryReset",

  FLOATING_ACTION_BUTTON_CLICK: "FloatingQuickBarButtonClick",
  FLOATING_ACTION_BUTTON_ON_SCREEN_HIDE: "FloatingQuickBarButtonOnScreenHide",
  FLOATING_ACTION_BUTTON_REPOSITION: "FloatingQuickBarButtonRepositioned",

  GOOGLE_FILE_PICKER_EVENT: "GoogleFilePickerEvent",

  HANDLE_CONTEXT_MENU: "HandleContextMenu",
  HANDLE_QUICK_BAR: "HandleQuickBar",

  IDB_RECLAIM_QUOTA: "IDBReclaimQuota",
  IDB_RECOVER_CONNECTION: "IDBRecoverConnection",
  IDB_UNRESPONSIVE_BANNER: "IDBUnresponsiveBanner",

  INTEGRATION_ADD: "ServiceAdd",
  INTEGRATION_WIDGET_CLEAR: "IntegrationWidgetClear",
  INTEGRATION_WIDGET_CONFIGURE_LINK_CLICK:
    "IntegrationWidgetConfigureLinkClick",
  INTEGRATION_WIDGET_REFRESH: "IntegrationWidgetRefresh",
  INTEGRATION_WIDGET_SELECT: "IntegrationWidgetSelect",

  LINK_EXTENSION: "LinkExtension",

  MARKETPLACE_REJECT_PERMISSIONS: "MarketplaceRejectPermissions",

  MODS_PAGE_VIEW: "BlueprintsPageView",

  MOD_ACTIVATE: "InstallBlueprint",
  MOD_ACTIVATION_CANCEL: "CancelModActivation",
  MOD_ACTIVATION_SUBMIT: "SubmitModActivation",
  MOD_ADD_STARTER_BRICK: "ModAddStarterBrick",
  MOD_COMPONENT_CLOUD_ACTIVATE: "ExtensionCloudActivate",
  MOD_COMPONENT_REMOVE: "ExtensionRemove",
  MOD_CREATE_NEW: "ExtensionAddNew",
  MOD_REMOVE: "BlueprintRemove",

  OAUTH2_LOGIN_ERROR: "OAuth2LoginError",
  OAUTH2_LOGIN_START: "OAuth2LoginStart",
  OAUTH2_LOGIN_SUCCESS: "OAuth2LoginSuccess",

  ORGANIZATION_EXTENSION_LINK: "OrganizationExtensionLink",

  PACKAGE_DELETE: "BrickDelete",
  PANEL_ADD: "PanelAdd",

  PAGE_EDITOR_CLEAR_CHANGES: "PageEditorReset",
  PAGE_EDITOR_MANUAL_RUN: "PageEditorManualRun",
  PAGE_EDITOR_MOD_COMPONENT_ERROR: "PageEditorExtensionError",
  PAGE_EDITOR_MOD_COMPONENT_REMOVE: "PageEditorRemove",
  PAGE_EDITOR_MOD_COMPONENT_UPDATE: "PageEditorCreate",
  PAGE_EDITOR_MOD_CREATE: "PageEditorModCreate",
  PAGE_EDITOR_MOD_SAVE_ERROR: "PageEditorModSaveError",
  PAGE_EDITOR_MOD_UPDATE: "PageEditorModUpdate",
  PAGE_EDITOR_OPEN: "PageEditorOpen",
  PAGE_EDITOR_SESSION_END: "PageEditorSessionEnd",
  PAGE_EDITOR_SESSION_START: "PageEditorSessionStart",
  PAGE_EDITOR_VIEW_TEMPLATES: "PageEditorViewTemplates",
  PAGE_EDITOR_WALKTHROUGH_LINK_CLICK: "PageEditorWalkthroughLinkClick",
  PAGE_EDITOR_WALKTHROUGH_MODAL_CLOSE: "PageEditorWalkthroughModalClose",
  PAGE_EDITOR_WALKTHROUGH_MODAL_VIEW: "PageEditorWalkthroughModalView",

  PERFORMANCE_MESSENGER_MANY_TABS_BROADCAST:
    "PerformanceMessengerManyTabsBroadcast",

  PIXIEBRIX_INSTALL: "PixieBrixInstall",
  PIXIEBRIX_RELOAD: "PixieBrixReload",
  PIXIEBRIX_UPDATE: "PixieBrixUpdate",

  SCHEMA_SELECT_WIDGET_CLEAR: "SchemaSelectWidgetClear",
  SCHEMA_SELECT_WIDGET_SELECT: "SchemaSelectWidgetSelect",

  SELECT_GOOGLE_SPREADSHEET_CANCELLED: "SelectGoogleSpreadsheetCancelled",
  SELECT_GOOGLE_SPREADSHEET_ENSURE_TOKEN_START:
    "SelectGoogleSpreadsheetEnsureTokenStart",
  SELECT_GOOGLE_SPREADSHEET_LOAD_LIBRARY_START:
    "SelectGoogleSpreadsheetLoadLibraryStart",
  SELECT_GOOGLE_SPREADSHEET_PICKED: "SelectGoogleSpreadsheetPicked",
  SELECT_GOOGLE_SPREADSHEET_SHOW_PICKER_START:
    "SelectGoogleSpreadsheetShowPickerStart",
  SELECT_GOOGLE_SPREADSHEET_START: "SelectGoogleSpreadsheetStart",
  SELECT_GOOGLE_SPREADSHEET_VIEW_WARNING: "SelectGoogleSpreadsheetViewWarning",

  SETTINGS_EXPERIMENTAL_CONFIGURE: "SettingsExperimentalConfigure",
  SIDEBAR_HIDE: "SidePanelHide",
  SIDEBAR_SHOW: "SidePanelShow",
  SIDEBAR_TAB_CLOSE: "SidebarTabClose",

  SHORTCUT_SNIPPET_RUN: "TextCommandRun",
  SNOOZE_UPDATES: "SnoozeUpdates",
  START_MOD_ACTIVATE: "StartInstallBlueprint",

  TOUR_END: "TourEnd",
  TOUR_START: "TourStart",
  TOUR_STEP: "TourStep",

  TRIGGER_RUN: "TriggerRun",

  UNINITIALIZED_GAPI_GATE_VIEW: "UninitializedGapiGateView",
  UNSUPPORTED_BROWSER_GATE_VIEW: "UnsupportedBrowserGateView",

  VAR_POPOVER_SELECT: "VarPopoverSelect",
  VAR_POPOVER_SHOW: "VarPopoverShow",

  VIEW_ERROR: "ViewError",
  VIEW_SIDEBAR_PANEL: "ViewSidePanelPanel",

  ZAPIER_KEY_COPY: "ZapierKeyCopy",
} as const;
