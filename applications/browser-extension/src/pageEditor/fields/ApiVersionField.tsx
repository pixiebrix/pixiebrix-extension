/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import ConnectedFieldTemplate from "../../components/form/ConnectedFieldTemplate";

/**
 * Developer-only component to select the brick runtime version for the mod. In general, developers should not
 * ever need to change the value.
 *
 * See https://docs.pixiebrix.com/developing-mods/developer-concepts/advanced-brick-runtime
 */
const ApiVersionField: React.FC = () => (
  <ConnectedFieldTemplate
    name="apiVersion"
    label="Extension API Version"
    as="select"
  >
    <option value="v1">v1</option>
    <option value="v2">v2</option>
    <option value="v3">v3</option>
  </ConnectedFieldTemplate>
);

export default React.memo(ApiVersionField);
