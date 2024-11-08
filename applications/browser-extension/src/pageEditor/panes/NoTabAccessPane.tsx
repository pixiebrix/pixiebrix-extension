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

import React from "react";
import Centered from "@/components/Centered";
import { parse as parseDomain } from "psl";
import useCurrentInspectedUrl from "@/pageEditor/hooks/useCurrentInspectedUrl";
import { canParseUrl } from "@/utils/urlUtils";

function getPageLabel(url: string): string | undefined {
  if (!canParseUrl(url)) {
    return;
  }

  const result = parseDomain(new URL(url).hostname);
  if ("domain" in result && result.domain) {
    return result.domain;
  }
}

/**
 * Panel the shows that PixieBrix does not have access to the page. Now that all URLs are included in the manifest's
 * required permissions, this can occur in two cases:
 * 1. The browser extension was restarted while page was open
 * 2. Permissions are blocked via runtime_blocked_hosts
 */
const NoTabAccessPane: React.FunctionComponent = () => {
  const url = useCurrentInspectedUrl();
  const siteLabel = (url && getPageLabel(url)) || "this page";

  return (
    <Centered vertically>
      <p className="font-weight-bold">
        PixieBrix cannot connect to {siteLabel}. Try reloading the Tab.
      </p>

      <p className="text-muted">
        If PixieBrix is managed by your Enterprise, contact your IT
        Administrator to ensure this URL is allowed by your {"organization's"}{" "}
        Chrome Extension Policy.
      </p>
    </Centered>
  );
};

export default NoTabAccessPane;
