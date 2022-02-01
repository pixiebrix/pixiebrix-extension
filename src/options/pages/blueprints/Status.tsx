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
import { Button } from "react-bootstrap";
import { Installable } from "./blueprintsTypes";
import useInstallableActions from "./useInstallableActions";

type StatusProps = {
  installable: Installable;
};

const Status: React.VoidFunctionComponent<StatusProps> = ({ installable }) => {
  const { activate, reinstall } = useInstallableActions(installable);

  return installable.active ? (
    <>
      {installable.hasUpdate ? (
        <Button size="sm" variant="warning" onClick={reinstall}>
          Update
        </Button>
      ) : (
        <div className="text-info py-2">Active</div>
      )}
    </>
  ) : (
    <Button size="sm" variant="info" onClick={activate}>
      Activate
    </Button>
  );
};

export default Status;
