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

import { type ValueOf } from "type-fest";

/**
 * Flags controlled by the user's primary organization (not waffle).
 */
export const OrganizationFlags = {
  /**
   * Enable additional metadata with error telemetry for enterprise customers.
   *
   * See: https://github.com/pixiebrix/pixiebrix-app/blob/9ecd1d0357d9221e91dca96b3dfea16dcef177f4/api/serializers/account.py#L326-L326
   */
  ENTERPRISE_TELEMETRY: "enterprise-telemetry",
} as const;

/**
 * Feature flag constants controlled by waffle: see https://app.pixiebrix.com/admin/waffle/flag/
 *
 * @see OrganizationFlags for flags set based on the user's primary organization
 * @see RestrictedFeatures for user flag's set based on the organization policy for the user's role
 */
export const FeatureFlags = {
  /**
   * Report deployment updates in product telemetry. Introduced to debug enterprise deployment update issues.
   */
  REPORT_BACKGROUND_DEPLOYMENTS: "report-background-deployments",

  /**
   * Enable performance and RUM sampling.
   */
  RUM_SESSION_RECORDING: "telemetry-performance",

  /**
   * Force recording the sidebar session replay during PixieBrix onboarding.
   */
  ONBOARDING_SIDEBAR_FORCE_SESSION_REPLAY:
    "onboarding-sidebar-force-session-replay",

  /**
   * Turn on local navigation tracing for debugging navigation/page load bugs.
   */
  NAVIGATION_TRACE: "navigation-trace",

  /**
   * Show storage statistics and actions in the settings page.
   */
  SETTINGS_STORAGE: "settings-storage",

  /**
   * Automatically update mod package versions marked as "force update".
   */
  AUTOMATIC_MOD_UPDATES: "automatic-mod-updates",

  /**
   * Show the FAB to freemium users (i.e., users with no team affiliation).
   */
  FLOATING_ACTION_BUTTON_FREEMIUM: "floating-quickbar-button-freemium",

  /**
   * Feature flag to control PixieBrix developer-only UI in the page editor.
   */
  PAGE_EDITOR_DEVELOPER: "page-editor-developer",

  /**
   * Show mod variables definition editor/affordances in the Page Editor
   */
  PAGE_EDITOR_MOD_VARIABLES_DEFINITION: "page-editor-mod-variables-definition",

  /**
   * Feature flag to show search affordances in the Page Editor.
   * @since 2.1.8
   */
  PAGE_EDITOR_SEARCH: "page-editor-search",

  /**
   * Show publish to public marketplace UI.
   * @since 1.7.37
   */
  PUBLISH_TO_MARKETPLACE: "publish-to-marketplace",

  /**
   * Strip the `sandbox` attribute from iframes so the content script can be injected.
   */
  SANDBOX_SRCDOC_HACK: "iframe-srcdoc-sandbox-hack",

  /**
   * Show deployment key UI.
   *
   * See https://docs.pixiebrix.com/deploying-mods/deployment-keys
   */
  DEPLOYMENT_KEY: "deployment-key",

  /**
   * Show experimental settings in the settings page.
   */
  SETTINGS_EXPERIMENTAL: "settings-experimental",

  /**
   * PixieBrix error service off switch/
   */
  ERROR_SERVICE_DISABLE_REPORT: "error-service-disable-report",

  /**
   * Datadog error telemetry off switch.
   *
   * Originally introduced when moving Datadog to the offscreen document in order to turn off error telemetry if
   * the offscreen document implementation was buggy.
   */
  APPLICATION_ERROR_TELEMETRY_DISABLE_REPORT:
    "application-error-telemetry-disable-report",

  /**
   * IndexDB logging off switch. This disables writing to the LOG database, along with
   * the clear debug logging and sweep logs functionality.
   *
   * Introduced to mitigate issues around idb logging causing runtime performance issues. See:
   * https://github.com/pixiebrix/pixiebrix-extension/issues/9169
   */
  DISABLE_IDB_LOGGING: "disable-idb-logging",

  /**
   * Experimental support for audio capture bricks.
   */
  FEATURE_FLAG_AUDIO_CAPTURE: "capture-audio",

  /**
   * Support creating new dynamic quickbar starter bricks in the Page Editor.
   */
  PAGE_EDITOR_DYNAMIC_QUICKBAR: "pageeditor-quickbar-provider",

  /**
   * Enables the mod personal sync feature.
   */
  MOD_PERSONAL_SYNC: "mod-personal-sync",
} as const;

/**
 * @see FeatureFlags
 * @see OrganizationFlags
 */
export type FeatureFlag =
  // The constants are split out to make it easier to see which flags are controlled by the organization policy.
  // But there's not much value in keeping them separate in flag checks
  ValueOf<typeof FeatureFlags> | ValueOf<typeof OrganizationFlags>;

const RESTRICTED_PREFIX = "restricted";

/**
 * Flags controlled by the organization policy for the user.
 *
 * @see FeatureFlags for system feature flags
 */
export const RestrictedFeatures = {
  /**
   * Ability to configure local integrations
   */
  LOCAL_INTEGRATIONS: "services",
  /**
   * Ability to access the public marketplace
   */
  MARKETPLACE: "marketplace",
  /**
   * Ability to deactivate or configure activated deployments
   */
  DEACTIVATE_DEPLOYMENT: "uninstall",
  /**
   * Ability to factory reset the extension
   */
  FACTORY_RESET: "reset",
  /**
   * Ability to clear authentication tokens
   */
  CLEAR_TOKEN: "clear-token",
  /**
   * Ability to set the PixieBrix service URL the extension connects to
   */
  SERVICE_URL: "service-url",
  /**
   * Access to the Page Editor
   */
  PAGE_EDITOR: "page-editor",
  /**
   * Access to the Workshop
   */
  WORKSHOP: "workshop",
};

/**
 * Flags controlled by the organization policy for the user.
 *
 * See: http://github.com/pixiebrix/pixiebrix-app/blob/f082ff5161ff79f696d9a8c35c755430e88fa4ab/api/serializers/account.py#L173-L173
 * @see RESTRICTED_PREFIX
 */
export type RestrictedFeature = ValueOf<typeof RestrictedFeatures>;

/**
 * Returns the backend flag that corresponds to the given restricted feature.
 *
 * The user flags set via organization policy are returned by the backend in the feature flags payload. However,
 * we keep them separate in the front-end to avoid mixing them with the system feature flags.
 */
export function mapRestrictedFeatureToFeatureFlag(
  area: RestrictedFeature,
): FeatureFlag {
  return `${RESTRICTED_PREFIX}-${area}` as FeatureFlag;
}
