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

import React from "react";
import Centered from "@/components/Centered";
import { safeParseUrl } from "@/utils";
import { parse as parseDomain } from "psl";
import useCurrentUrl from "@/pageEditor/hooks/useCurrentUrl";
import { useSelector } from "react-redux";
import { selectIsContextInvalidated } from "@/pageEditor/tabState/tabStateSelectors";
import { CONTEXT_INVALIDATED_MESSAGE } from "@/pageEditor/tabState/tabStateSlice";

function getPageLabel(url: string): string {
  const { hostname } = safeParseUrl(url);
  const result = parseDomain(hostname);
  if ("domain" in result && result.domain) {
    return result.domain;
  }
}

/**
 * Panel the shows that PixieBrix does not have access to the page. Now that all URLs are included in the manifest's
 * required permissions, this can occur in three cases:
 * 1. The browser extension was restarted while page was open
 * 2. The extension context was invalidated in tab
 * 3. Permissions are blocked via runtime_blocked_hosts
 * @constructor
 */
const NoTabAccessPane: React.FunctionComponent = () => {
  const url = useCurrentUrl();
  const siteLabel = (url && getPageLabel(url)) || "this page";

  const isContextInvalidated = useSelector(selectIsContextInvalidated);

  if (isContextInvalidated) {
    // Ideally, if the context was invalidated, we'd also provide a button to automatically reload the inspected tab.
    // However, because the context is invalidated, we can't send the message to reload it.
    return (
      <Centered vertically>
        <p>{CONTEXT_INVALIDATED_MESSAGE}</p>
      </Centered>
    );
  }

  return (
    <Centered vertically>
      <p>
        PixieBrix cannot connect to {siteLabel}. Please try reloading the Tab.
      </p>

      <p>
        If you are part of an Enterprise deployment, please contact your IT
        Administrator to ensure this URL is allowed by your {"organization's"}{" "}
        Chrome Extension Policy,
      </p>
    </Centered>
  );
};

export default NoTabAccessPane;
