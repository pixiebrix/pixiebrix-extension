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

import { utils, WidgetProps } from "@rjsf/core";
import React from "react";
import { FormGroup, FormLabel } from "react-bootstrap";

const RjsfArrayField = utils.getDefaultRegistry().widgets.SelectWidget;

const SelectWidgetPreview: React.VFC<WidgetProps> = (props) => {
  console.log("FormPreviewArrayField props:", props);
  if (typeof props.schema.enum === "string") {
    return (
      <FormGroup>
        <FormLabel>{props.schema.title}</FormLabel>
        <div className="text-muted form-text">
          Dropdown options defined by a variable are not displayed in preview.
        </div>
      </FormGroup>
    );
  }

  return <RjsfArrayField {...props} />;
};

export default SelectWidgetPreview;
