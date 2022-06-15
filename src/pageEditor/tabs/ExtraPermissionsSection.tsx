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

import FieldSection from "@/pageEditor/fields/FieldSection";
import React from "react";
import UrlMatchPatternField from "@/pageEditor/fields/UrlMatchPatternField";

const ExtraPermissionsSection: React.FunctionComponent = () => (
  <FieldSection title="Advanced: Extra Permissions">
    <UrlMatchPatternField
      label="Sites/APIs"
      name="permissions.origins"
      addButtonCaption={"Add Allowed Origin"}
      description={
        <div>
          URL match patterns permitting the extension to run on a site or call
          an API. Provide URL match patterns here if the extension either 1)
          calls an API without using an Integration, or 2) performs actions on a
          target tab not included in the Site match patterns
        </div>
      }
    />
  </FieldSection>
);

export default ExtraPermissionsSection;
