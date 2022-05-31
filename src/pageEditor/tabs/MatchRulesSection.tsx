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

import UrlPatternField from "@/pageEditor/fields/UrlPatternField";
import { makeLockableFieldProps } from "@/pageEditor/fields/makeLockableFieldProps";
import SelectorMatchField from "@/pageEditor/fields/SelectorMatchField";
import FieldSection from "@/pageEditor/fields/FieldSection";
import React from "react";

const MatchRulesSection: React.FunctionComponent<{
  isLocked: boolean;
}> = ({ isLocked }) => (
  <FieldSection title="Advanced: Match Rules">
    <UrlPatternField
      name="extensionPoint.definition.isAvailable.urlPatterns"
      {...makeLockableFieldProps("URL Patterns", isLocked)}
    />

    <SelectorMatchField
      name="extensionPoint.definition.isAvailable.selectors"
      {...makeLockableFieldProps("Selectors", isLocked)}
    />
  </FieldSection>
);

export default MatchRulesSection;
