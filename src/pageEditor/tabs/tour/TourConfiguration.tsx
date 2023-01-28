/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { Card } from "react-bootstrap";
import FieldSection from "@/pageEditor/fields/FieldSection";
import UrlMatchPatternField from "@/pageEditor/fields/UrlMatchPatternField";
import { makeLockableFieldProps } from "@/pageEditor/fields/makeLockableFieldProps";
import ExtraPermissionsSection from "@/pageEditor/tabs/ExtraPermissionsSection";
import MatchRulesSection from "@/pageEditor/tabs/MatchRulesSection";

const TourConfiguration: React.FC<{
  isLocked: boolean;
}> = ({ isLocked = false }) => (
  <Card>
    <FieldSection title="Configuration">
      <UrlMatchPatternField
        name="extensionPoint.definition.isAvailable.matchPatterns"
        {...makeLockableFieldProps("Sites", isLocked)}
      />
    </FieldSection>

    <MatchRulesSection isLocked={isLocked} />

    <ExtraPermissionsSection />
  </Card>
);

export default TourConfiguration;
