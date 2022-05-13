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

import Alert from "@/components/Alert";
import React from "react";

type OldBlueprintWarningProps = {};

const OldBlueprintWarning: React.FunctionComponent<OldBlueprintWarningProps> = (
  props
) => {
  return (
    <Alert variant="warning">
      You are editing version X.X.X of this blueprint, the latest version is
      X.X.X. To get the latest version,{" "}
      <a href="/options.html" target="_blank" title="Re-activate the blueprint">
        re-activate the blueprint
      </a>
    </Alert>
  );
};

export default OldBlueprintWarning;
