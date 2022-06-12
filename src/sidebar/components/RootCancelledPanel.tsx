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
import { CancelError } from "@/errors/businessErrors";
import { getErrorMessage } from "@/errors/errorHelpers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStarHalfAlt } from "@fortawesome/free-solid-svg-icons";

const RootCancelledPanel: React.VoidFunctionComponent<{
  error: CancelError;
}> = ({ error }) => (
  <div className="d-flex p-4">
    <div className="text-muted text-center mx-auto">
      <h1 className="display-1">
        <FontAwesomeIcon icon={faStarHalfAlt} />
      </h1>

      <div className="mb-2">Panel not available</div>
      <div>
        <small>Reason: {getErrorMessage(error)}</small>
      </div>
    </div>
  </div>
);

export default RootCancelledPanel;
