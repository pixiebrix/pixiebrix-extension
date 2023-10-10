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

export const Events = {
  AUTH_WIDGET_SELECT: "AuthWidgetSelect",
  AUTH_WIDGET_REFRESH: "AuthWidgetRefresh",
  AUTH_WIDGET_SHOW_ADD_NEW: "AuthWidgetShowAddNew",
  AUTH_WIDGET_HIDE_ADD_NEW: "AuthWidgetHideAddNew",

  BRICK_ADD: "BrickAdd",
  BRICK_DELETE: "BrickDelete",

  CUSTOM_USER_EVENT: "CustomUserEvent",

  DEPLOYMENT_ACTIVATE: "DeploymentActivate",
  DEPLOYMENT_DEACTIVATE_ALL: "DeploymentDeactivateAll",
  DEPLOYMENT_DEACTIVATE_UNASSIGNED: "DeploymentDeactivateUnassigned",
  DEPLOYMENT_REJECT_VERSION: "DeploymentRejectVersion",
  DEPLOYMENT_REJECT_PERMISSIONS: "DeploymentRejectPermissions",

  EXTENSION_CLOUD_DELETE: "ExtensionCloudDelete",

  FACTORY_RESET: "FactoryReset",

  FLOATING_QUICK_BAR_BUTTON_CLICK: "FloatingQuickBarButtonClick",
  FLOATING_QUICK_BAR_BUTTON_REPOSITIONED: "FloatingQuickBarButtonRepositioned",
  FLOATING_QUICK_BAR_BUTTON_ON_SCREEN_HIDE:
    "FloatingQuickBarButtonOnScreenHide",
  FLOATING_QUICK_BAR_BUTTON_TOGGLE_SETTING:
    "ToggleFloatingQuickBarButtonSetting",

  GOOGLE_FILE_PICKER_EVENT: "GoogleFilePickerEvent",

  HANDLE_CONTEXT_MENU: "HandleContextMenu",
  HANDLE_QUICK_BAR: "HandleQuickBar",

  IDB_RECLAIM_QUOTA: "IDBReclaimQuota",
  IDB_RECOVER_CONNECTION: "IDBRecoverConnection",

  INTEGRATION_WIDGET_SELECT: "IntegrationWidgetSelect",
  INTEGRATION_WIDGET_CLEAR: "IntegrationWidgetClear",
  INTEGRATION_WIDGET_REFRESH: "IntegrationWidgetRefresh",
  INTEGRATION_WIDGET_CONFIGURE_LINK_CLICK:
    "IntegrationWidgetConfigureLinkClick",

  INTEGRATION_ADD: "ServiceAdd",

  LINK_EXTENSION: "LinkExtension",

  MARKETPLACE_ACTIVATE: "MarketplaceActivate",
  MARKETPLACE_REJECT_PERMISSIONS: "MarketplaceRejectPermissions",

  MENU_ITEM_CLICK: "MenuItemClick",

  MOD_ACTIVATE: "InstallBlueprint",
  MOD_ACTIVATION_CANCEL: "CancelModActivation",
  MOD_ACTIVATION_SUBMIT: "SubmitModActivation",
  MOD_COMPONENT_ADD_NEW: "ExtensionAddNew",
  MOD_COMPONENT_CLOUD_ACTIVATE: "ExtensionCloudActivate",
  MOD_COMPONENT_REMOVE: "ExtensionRemove",
  MOD_REMOVE: "BlueprintRemove",

  MODS_PAGE_VIEW: "BlueprintsPageView",

  OAUTH2_LOGIN_START: "OAuth2LoginStart",
  OAUTH2_LOGIN_SUCCESS: "OAuth2LoginSuccess",
  OAUTH2_LOGIN_ERROR: "OAuth2LoginError",

  ORGANIZATION_EXTENSION_LINK: "OrganizationExtensionLink",

  PAGE_EDITOR_CREATE: "PageEditorCreate",
  PAGE_EDITOR_OPEN: "PageEditorOpen",
  PAGE_EDITOR_MANUAL_RUN: "PageEditorManualRun",
  PAGE_EDITOR_MOD_COMPONENT_ERROR: "PageEditorExtensionError",
  PAGE_EDITOR_REMOVE: "PageEditorRemove",
  PAGE_EDITOR_RESET: "PageEditorReset",
  PAGE_EDITOR_SAVE: "PageEditorSave",
  PAGE_EDITOR_START: "PageEditorStart",

  PAGE_EDITOR_SESSION_START: "PageEditorSessionStart",
  PAGE_EDITOR_SESSION_END: "PageEditorSessionEnd",

  VAR_POPOVER_SHOW: "VarPopoverShow",
  VAR_POPOVER_SELECT: "VarPopoverSelect",

  PANEL_ADD: "PanelAdd",

  PIXIEBRIX_INSTALL: "PixieBrixInstall",
  PIXIEBRIX_RELOAD: "PixieBrixReload",
  PIXIEBRIX_UPDATE: "PixieBrixUpdate",

  SCHEMA_SELECT_WIDGET_SELECT: "SchemaSelectWidgetSelect",
  SCHEMA_SELECT_WIDGET_CLEAR: "SchemaSelectWidgetClear",

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

  SIDEBAR_HIDE: "SidePanelHide",
  SIDEBAR_SHOW: "SidePanelShow",
  SIDEBAR_TAB_CLOSE: "SidebarTabClose",

  SNOOZE_UPDATES: "SnoozeUpdates",
  SETTINGS_EXPERIMENTAL_CONFIGURE: "SettingsExperimentalConfigure",

  START_MOD_ACTIVATE: "StartInstallBlueprint",

  STARTER_BRICK_ACTIVATE: "ExtensionActivate",

  TOUR_START: "TourStart",
  TOUR_STEP: "TourStep",
  TOUR_END: "TourEnd",

  TRIGGER_RUN: "TriggerRun",

  UNINITIALIZED_GAPI_GATE_VIEW: "UninitializedGapiGateView",

  UNSUPPORTED_BROWSER_GATE_VIEW: "UnsupportedBrowserGateView",

  VIEW_ERROR: "ViewError",
  VIEW_SIDEBAR_PANEL: "ViewSidePanelPanel",

  ZAPIER_KEY_COPY: "ZapierKeyCopy",
} as const;

export type Event = typeof Events[keyof typeof Events];
