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
import SelectWidget, {
  SelectWidgetProps,
} from "@/components/form/widgets/SelectWidget";
import { AuthOption } from "@/auth/authTypes";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync } from "@fortawesome/free-solid-svg-icons";

const ServiceSelectWidget: React.FunctionComponent<
  SelectWidgetProps<AuthOption> & { refreshOptions: () => void }
> = ({ refreshOptions, ...selectProps }) => (
  <div className="d-flex">
    <div className="flex-grow-1">
      <SelectWidget {...selectProps} />
    </div>
    <div>
      <Button
        onClick={refreshOptions}
        variant="info"
        title="Refresh configured integrations"
      >
        <FontAwesomeIcon icon={faSync} />
      </Button>
    </div>
  </div>
);

export default ServiceSelectWidget;
