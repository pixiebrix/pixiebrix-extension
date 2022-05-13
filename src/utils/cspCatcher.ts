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

import pDefer from "p-defer";

// CSP events are dispatched "immediately" after the `fetch` request.
// This usually happens within one millisecond but I've seen 20ms too.
const CSP_REPORT_TIMEOUT_MS = 100;

/**
 * Wait for any CSP violation events that might be dispatched after a `fetch` failure.
 * This must be called immediately after a `fetch` failure.
 * It resolve at most CSP_REPORT_TIMEOUT_MS later.
 */
export async function getLastCspViolation(
  requestedUrl: string
): Promise<SecurityPolicyViolationEvent | undefined> {
  const { promise, resolve } = pDefer<SecurityPolicyViolationEvent>();
  const listener = (event: SecurityPolicyViolationEvent) => {
    if (event.blockedURI === requestedUrl) {
      resolve(event);
    }
  };

  setTimeout(resolve, CSP_REPORT_TIMEOUT_MS);
  document.addEventListener("securitypolicyviolation", listener);

  try {
    return await promise;
  } finally {
    document.removeEventListener("securitypolicyviolation", listener);
  }
}
