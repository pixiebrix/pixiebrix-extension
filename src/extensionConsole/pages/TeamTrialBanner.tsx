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

import Banner from "@/components/banner/Banner";
import useTeamTrialStatus, {
  TeamTrialStatus,
} from "@/extensionConsole/pages/useTeamTrialStatus";
import React from "react";
import { Collapse } from "react-bootstrap";

const TrialCallToActionLink = () => (
  <a
    href="https://calendly.com/pixiebrix-mike/20min"
    target="_blank"
    rel="noopener noreferrer"
  >
    here.
  </a>
);

const TeamTrialBanner: React.FunctionComponent = () => {
  const teamTrialStatus = useTeamTrialStatus();

  return (
    <Collapse in={teamTrialStatus != null} mountOnEnter>
      <Banner
        variant={
          teamTrialStatus === TeamTrialStatus.EXPIRED ? "danger" : "warning"
        }
      >
        {"Your team trial is "}
        {teamTrialStatus === TeamTrialStatus.EXPIRED
          ? "expired!"
          : "in progress."}
        {" Talk to an onboarding specialist now to upgrade. Schedule a time "}
        <TrialCallToActionLink />
      </Banner>
    </Collapse>
  );
};

export default TeamTrialBanner;
