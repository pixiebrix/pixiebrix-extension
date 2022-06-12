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
import { getErrorMessage, selectSpecificError } from "@/errors/errorHelpers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBug,
  faExclamationCircle,
  faQuestionCircle,
} from "@fortawesome/free-solid-svg-icons";
import { BusinessError, NoRendererError } from "@/errors/businessErrors";

const RootErrorPanel: React.VoidFunctionComponent<{ error: unknown }> = ({
  error,
}) => {
  const rendererError = selectSpecificError(error, NoRendererError);

  if (rendererError) {
    return (
      <div className="d-flex p-4">
        <div className="text-info text-center mx-auto">
          <h1 className="display-1">
            <FontAwesomeIcon icon={faQuestionCircle} />
          </h1>
          <div className="mb-2">No renderer found</div>
          <div>
            <small>Add a renderer brick to the extension.</small>
          </div>
        </div>
      </div>
    );
  }

  const businessError = selectSpecificError(error, BusinessError);

  if (businessError) {
    return (
      <div className="d-flex p-4">
        <div className="text-danger text-center mx-auto">
          <h1 className="display-1">
            <FontAwesomeIcon icon={faExclamationCircle} />
          </h1>

          <div className="mb-2">Configuration error running panel</div>
          <div>
            <small>{getErrorMessage(error)}</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex p-4">
      <div className="text-danger text-center mx-auto">
        <h1 className="display-1">
          <FontAwesomeIcon icon={faBug} />
        </h1>

        <div className="mb-2">Application error running panel</div>
        <div>
          <small>{getErrorMessage(error)}</small>
        </div>
      </div>
    </div>
  );
};

export default RootErrorPanel;
