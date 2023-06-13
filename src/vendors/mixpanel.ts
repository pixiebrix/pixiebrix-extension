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

import { includes } from "lodash";

/**
 * This function detects which browser is running this script.
 * The order of the checks are important since many user agents
 * include key words used in later checks.
 * @param userAgent
 * @param vendor
 */
// https://github.com/mixpanel/mixpanel-js/blob/master/src/utils.js#L1489
export function detectBrowser(
  userAgent: string,
  vendor: string | null
): string {
  vendor = vendor ?? ""; // vendor is undefined for at least IE9
  if (includes(userAgent, " OPR/")) {
    if (includes(userAgent, "Mini")) {
      return "Opera Mini";
    }
    return "Opera";
  } else if (/(BlackBerry|PlayBook|BB10)/i.test(userAgent)) {
    return "BlackBerry";
  } else if (
    includes(userAgent, "IEMobile") ||
    includes(userAgent, "WPDesktop")
  ) {
    return "Internet Explorer Mobile";
  } else if (includes(userAgent, "SamsungBrowser/")) {
    // https://developer.samsung.com/internet/user-agent-string-format
    return "Samsung Internet";
  } else if (includes(userAgent, "Edge") || includes(userAgent, "Edg/")) {
    return "Microsoft Edge";
  } else if (includes(userAgent, "FBIOS")) {
    return "Facebook Mobile";
  } else if (includes(userAgent, "Chrome")) {
    return "Chrome";
  } else if (includes(userAgent, "CriOS")) {
    return "Chrome iOS";
  } else if (includes(userAgent, "UCWEB") || includes(userAgent, "UCBrowser")) {
    return "UC Browser";
  } else if (includes(userAgent, "FxiOS")) {
    return "Firefox iOS";
  } else if (includes(vendor, "Apple")) {
    if (includes(userAgent, "Mobile")) {
      return "Mobile Safari";
    }
    return "Safari";
  } else if (includes(userAgent, "Android")) {
    return "Android Mobile";
  } else if (includes(userAgent, "Konqueror")) {
    return "Konqueror";
  } else if (includes(userAgent, "Firefox")) {
    return "Firefox";
  } else if (includes(userAgent, "MSIE") || includes(userAgent, "Trident/")) {
    return "Internet Explorer";
  } else if (includes(userAgent, "Gecko")) {
    return "Mozilla";
  } else {
    return "";
  }
}
