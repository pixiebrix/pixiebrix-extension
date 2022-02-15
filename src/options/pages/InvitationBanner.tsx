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

import React from "react";
import Banner from "@/components/banner/Banner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { useGetInvitationsQuery } from "@/services/api";

// eslint-disable-next-line prefer-destructuring -- It breaks EnvironmentPlugin
const SERVICE_URL = process.env.SERVICE_URL;

const InvitationBanner: React.FunctionComponent = () => {
  const { data: invitations } = useGetInvitationsQuery();
  const invitationsAvailable = invitations?.length > 0;

  if (!invitationsAvailable) {
    return null;
  }

  return (
    <Banner variant="info">
      You have team invitations waiting for you! &nbsp;
      <span role="img" aria-label="sparkles">
        ✨
      </span>
      <span role="img" aria-label="envelope">
        ✉️
      </span>
      &nbsp; You can view them on the{" "}
      <a href={`${SERVICE_URL}/team`} target="_blank" rel="noopener noreferrer">
        &quot;My Team&quot; Page <FontAwesomeIcon icon={faExternalLinkAlt} />
      </a>{" "}
      of the Admin Console.
    </Banner>
  );
};

export default InvitationBanner;
