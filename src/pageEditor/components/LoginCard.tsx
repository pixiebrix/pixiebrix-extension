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

import Loader from "@/components/Loader";
import { useAsyncState } from "@/hooks/common";
import { getBaseURL } from "@/services/baseService";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { Card, Button } from "react-bootstrap";

type LoginCardProps = {};

const LoginCard: React.VoidFunctionComponent<LoginCardProps> = (props) => {
  const [installURL, installURLPending] = useAsyncState(async () => {
    const url = new URL(await getBaseURL());
    url.searchParams.set("install", "1");
    return url.toString();
  }, []);

  if (installURLPending) {
    return <Loader />;
  }

  return (
    <Card>
      <Card.Body>
        <p>Link the extension to a PixieBrix account</p>
        <Button
          role="button"
          className="btn btn-primary mt-2"
          target="_blank"
          href={installURL}
        >
          <FontAwesomeIcon icon={faLink} /> Create/link PixieBrix account
        </Button>
      </Card.Body>
    </Card>
  );
};

export default LoginCard;
