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
import OnboardingChecklistCard, {
  OnboardingStep,
} from "@/components/onboarding/OnboardingChecklistCard";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";

const DefaultSetupCard: React.FunctionComponent<{
  installURL: string;
}> = ({ installURL }) => (
  <OnboardingChecklistCard title="PixieBrix setup steps">
    <OnboardingStep
      number={1}
      title="Install the PixieBrix browser extension"
      completed
    />
    <OnboardingStep
      number={2}
      title="Link the extension to a PixieBrix account"
      active
    >
      <Button role="button" className="btn btn-primary mt-2" href={installURL}>
        <FontAwesomeIcon icon={faLink} /> Create/link PixieBrix account
      </Button>
    </OnboardingStep>
  </OnboardingChecklistCard>
);

export default DefaultSetupCard;
