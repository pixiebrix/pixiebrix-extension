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

import React, { useState } from "react";
import { useAsyncState } from "@/hooks/common";
import { getBaseURL } from "@/services/baseService";
import { useAsyncEffect } from "use-async-effect";
import { isLinked } from "@/auth/token";
import { Card } from "react-bootstrap";
import urljoin from "url-join";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";

const ConnectExtensionCard: React.FunctionComponent = () => {
  const [hasExtensionKey, setHasExtensionKey] = useState(true);
  const [serviceURL] = useAsyncState(getBaseURL);

  useAsyncEffect(
    async (isMounted) => {
      const hasKey = await isLinked();
      if (isMounted()) return;
      setHasExtensionKey(hasKey);
    },
    [setHasExtensionKey]
  );

  if (hasExtensionKey) {
    return null;
  }

  return (
    <Card className="mb-4">
      <Card.Header>Connect to PixieBrix</Card.Header>
      <Card.Body>
        <p>
          By linking your browser extension with PixieBrix, you&apos;ll get
          access to team features and public services.
        </p>
        {serviceURL && (
          <a
            href={urljoin(serviceURL, "extension")}
            className="btn btn-primary"
            rel="noreferrer"
            target="_blank"
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} /> Open PixieBrix Website
          </a>
        )}
      </Card.Body>
    </Card>
  );
};

export default ConnectExtensionCard;
