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

import Policy from "csp-parse";
import { normalizeManifestPermissions } from "webext-permissions";
import { excludeDuplicatePatterns } from "webext-patterns";

function getVersion(env) {
  // `manifest.json` only supports numbers in the version, so use the semver
  const match = /^(?<version>\d+\.\d+\.\d+)/.exec(env.npm_package_version);
  return match.groups.version;
}

function getVersionName(env, isProduction) {
  if (env.ENVIRONMENT === "staging") {
    // Staging builds (i.e., from CI) are production builds, so check ENVIRONMENT first
    return `${getVersion(env)}-alpha+${env.SOURCE_VERSION}`;
  }

  if (isProduction) {
    return env.npm_package_version;
  }

  return `${env.npm_package_version}-local+${new Date().toISOString()}`;
}

/**
 * @param {chrome.runtime.ManifestV2} manifestV2
 * @returns chrome.runtime.ManifestV3
 */
function updateManifestToV3(manifestV2) {
  const manifest = structuredClone(manifestV2);
  manifest.manifest_version = 3;

  // Extract host permissions
  const { permissions, origins } = normalizeManifestPermissions(manifest);
  manifest.permissions = [...permissions, "scripting"];
  manifest.host_permissions = origins;

  // Update format
  manifest.web_accessible_resources = [
    {
      resources: manifest.web_accessible_resources,
      matches: ["*://*/*"],
    },
  ];

  // Rename keys
  manifest.action = manifest.browser_action;
  delete manifest.browser_action;

  // Update CSP format and drop invalid values
  const policy = new Policy(manifest.content_security_policy);
  policy.remove("script-src", "https://apis.google.com");
  policy.remove("script-src", "'unsafe-eval'");
  manifest.content_security_policy = {
    extension_pages: policy.toString(),

    // Set the native default CSP
    // https://developer.chrome.com/docs/extensions/mv3/manifest/sandbox/
    sandbox:
      "sandbox allow-scripts allow-forms allow-popups allow-modals; script-src 'self' 'unsafe-inline' 'unsafe-eval'; child-src 'self';",
  };

  // Replace background script
  manifest.background = {
    service_worker: "background.worker.js",
  };

  return manifest;
}

/**
 * @param {chrome.runtime.ManifestV2} manifest
 * @returns chrome.runtime.ManifestV3
 */
function customizeManifest(manifestV2, options = {}) {
  const { isProduction, manifestVersion, env = {} } = options;
  const manifest = structuredClone(manifestV2);
  manifest.version = getVersion(env);
  manifest.version_name = getVersionName(env, isProduction);

  if (!isProduction) {
    manifest.name = "PixieBrix - Development";
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

  const policy = new Policy(manifest.content_security_policy);

  if (!isProduction) {
    // React Dev Tools app. See https://github.com/pixiebrix/pixiebrix-extension/wiki/Development-commands#react-dev-tools
    policy.add("script-src", "http://localhost:8097");
    policy.add("connect-src", "ws://localhost:8097/");
    policy.add("img-src", "https://pixiebrix-marketplace-dev.s3.amazonaws.com");
  }

  manifest.content_security_policy = policy.toString();

  if (env.EXTERNALLY_CONNECTABLE) {
    manifest.externally_connectable.matches = excludeDuplicatePatterns([
      ...manifest.externally_connectable.matches,
      ...env.EXTERNALLY_CONNECTABLE.split(","),
      ...internal,
    ]);
  }

  if (manifestVersion === 3) {
    return updateManifestToV3(manifest);
  }

  return manifest;
}

export default customizeManifest;
