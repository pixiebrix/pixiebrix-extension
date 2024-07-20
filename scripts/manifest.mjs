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

import Policy from "csp-parse";
import { excludeDuplicatePatterns } from "webext-patterns";

function getVersion(env) {
  const stageMap = {
    alpha: 1000,
    beta: 2000,
    release: 3000,
  };

  // `manifest.json` only supports numbers in the version, so use the semver
  const match =
    /^(?<version>\d+\.\d+\.\d+)(?:-(?<stage>\w+)(?:\.(?<stageNumber>\d+))?)?/.exec(
      env.npm_package_version,
    );
  const { version, stage, stageNumber } = match.groups;

  // Add 4th digit for differentiating alpha/beta/stable release builds.
  // Used primarily to update the extension BETA listing in the Chrome Web Store.
  if (stage && stageNumber) {
    // Ex: 1.8.13-alpha.1 -> 1.8.13.1001
    // Ex: 1.8.13-beta.55 -> 1.8.13.2055
    return `${version}.${stageMap[stage] + Number(stageNumber)}`;
  }

  // Ex: 1.8.13.3000 -- Ensures that the release build version number is greater than the alpha/beta build version numbers
  return `${version}.${stageMap.release}`;
}

function getVersionName(env, isProduction) {
  if (env.ENVIRONMENT === "staging") {
    // Staging builds (i.e., from CI) are production builds, so check ENVIRONMENT first
    return `${getVersion(env)}-alpha+${env.SOURCE_VERSION}`;
  }

  if (isProduction) {
    return `${env.npm_package_version}`;
  }

  // Can't use isoTimestamp helper in webpack helpers
  return `${env.npm_package_version}-local+${new Date().toISOString()}`;
}

/**
 * Add internal URLs to the content scripts targeting the Admin Console so the Extension can talk to
 * a locally running Admin Console during development.
 *
 * @param manifest
 * @param internal
 */
function addInternalUrlsToContentScripts(manifest, internal) {
  const ADMIN_CONSOLE_MATCH_PATTERN = "https://*.pixiebrix.com/*";

  for (const [index, contentScript] of Object.entries(
    manifest.content_scripts,
  )) {
    if (contentScript.matches.includes(ADMIN_CONSOLE_MATCH_PATTERN)) {
      manifest.content_scripts[index].matches = excludeDuplicatePatterns([
        ...contentScript.matches,
        ...internal,
      ]);
    }
  }
}

/**
 * @param manifestV3
 * @returns chrome.runtime.Manifest
 */
function customizeManifest(manifestV3, options = {}) {
  const { isProduction, env = {}, isBeta } = options;
  const manifest = structuredClone(manifestV3);
  manifest.version = getVersion(env);
  manifest.version_name = getVersionName(env, isProduction);

  if (!isProduction) {
    manifest.name = "PixieBrix - Development";
  }

  if (isBeta) {
    manifest.name = "PixieBrix BETA";
    manifest.short_name = "PixieBrix BETA";

    manifest.icons["16"] = "icons/beta/logo16.png";
    manifest.icons["32"] = "icons/beta/logo32.png";
    manifest.icons["48"] = "icons/beta/logo48.png";
    manifest.icons["128"] = "icons/beta/logo128.png";
  }

  if (env.CHROME_MANIFEST_KEY) {
    manifest.key = env.CHROME_MANIFEST_KEY;
  }

  const internal = isProduction
    ? []
    : // The port is part of the origin: https://developer.mozilla.org/en-US/docs/Web/API/URL/origin
      [
        "http://127.0.0.1:8000/*",
        "http://127.0.0.1/*",
        "http://localhost/*",
        "http://localhost:8000/*",
      ];

  const policy = new Policy(manifest.content_security_policy.extension_pages);

  if (!isProduction) {
    policy.add("img-src", "https://pixiebrix-marketplace-dev.s3.amazonaws.com");

    // React Dev Tools app. See https://github.com/pixiebrix/pixiebrix-extension/wiki/Development-commands#react-dev-tools
    policy.add("script-src", "http://localhost:8097");
    policy.add("connect-src", "ws://localhost:8097/");

    // React Refresh (HMR)
    policy.add("connect-src", "ws://127.0.0.1:8080/");
    policy.add("connect-src", "ws://127.0.0.1/");
  }

  manifest.content_security_policy.extension_pages = policy.toString();

  const externallyConnectable = [
    ...manifest.externally_connectable.matches,
    ...(env.EXTERNALLY_CONNECTABLE?.split(",") ?? []),
    ...internal,
  ];

  manifest.externally_connectable.matches = excludeDuplicatePatterns(
    externallyConnectable,
  );

  addInternalUrlsToContentScripts(manifest, internal);

  // HMR support
  if (!isProduction) {
    manifest.web_accessible_resources[0].resources.push("*.json");
  }

  // Playwright does not support dynamically accepting permissions for extensions, so we need to add all permissions
  // to the manifest. This is only necessary for Playwright tests.
  if (env.REQUIRE_OPTIONAL_PERMISSIONS_IN_MANIFEST) {
    manifest.permissions.push(...manifest.optional_permissions);
  }

  return manifest;
}

export default customizeManifest;
