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
      &nbsp; Visit the{" "}
      <a href={`${SERVICE_URL}`} target="_blank" rel="noopener noreferrer">
        Admin Console <FontAwesomeIcon icon={faExternalLinkAlt} />
      </a>{" "}
      to view them.
    </Banner>
  );
};

export default InvitationBanner;
