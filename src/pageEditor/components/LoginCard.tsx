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

import { useAsyncState } from "@/hooks/common";
import { getInstallURL } from "@/services/baseService";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { Button } from "react-bootstrap";
import Centered from "./Centered";

const LoginCard: React.VoidFunctionComponent = () => {
  const [installURL] = useAsyncState(getInstallURL, []);

  return (
    <Centered vertically>
      <p>Complete PixieBrix Extension setup to use the Page Editor</p>
      <Button
        variant="primary"
        className="mt-2"
        target="_blank"
        href={installURL ?? "/options.html"}
      >
        <FontAwesomeIcon icon={faLink} /> Create/link PixieBrix account
      </Button>
    </Centered>
  );
};

export default LoginCard;
