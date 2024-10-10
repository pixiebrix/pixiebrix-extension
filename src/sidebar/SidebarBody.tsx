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
import ConnectedSidebar from "./ConnectedSidebar";
import Header from "./Header";
import RestrictedUrlPopupApp from "@/tinyPages/RestrictedUrlPopupApp";
import useConnectedTargetUrl from "./hooks/useConnectedTargetUrl";
import { getReasonByUrl as getRestrictedReasonByUrl } from "@/tinyPages/restrictedUrlPopupUtils";
import DatabaseUnresponsiveBanner from "@/components/DatabaseUnresponsiveBanner";
import TeamTrialBanner from "@/components/teamTrials/TeamTrialBanner";

const SidebarReady: React.FC<{ url: string }> = ({ url }) => {
  const restricted = getRestrictedReasonByUrl(url);

  return restricted ? (
    <RestrictedUrlPopupApp reason={restricted} url={url} />
  ) : (
    <ConnectedSidebar />
  );
};

// Include MemoryRouter because some of our authentication-gate hooks use useLocation. However, there's currently no
// navigation in the SidebarApp
function SidebarBody() {
  const url = useConnectedTargetUrl();
  return (
    <>
      <Header />
      <TeamTrialBanner />
      <DatabaseUnresponsiveBanner />
      <div className="full-height">{url && <SidebarReady url={url} />}</div>
    </>
  );
}

export default SidebarBody;
