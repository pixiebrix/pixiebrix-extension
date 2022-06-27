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
import { Button } from "react-bootstrap";
import OnboardingChecklistCard, {
  OnboardingStep,
} from "@/components/onboarding/OnboardingChecklistCard";
import { useGetMeQuery } from "@/services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import AutomationAnywhereTokenForm, {
  ControlRoomConfiguration,
} from "@/options/pages/onboarding/AutomationAnywhereTokenForm";

const PartnerSetupCard: React.FunctionComponent<{
  installURL: string;
  isAccountUnlinked: boolean;
  needsConfiguration: boolean;
}> = ({ installURL, isAccountUnlinked, needsConfiguration }) => {
  const { data: me, isLoading } = useGetMeQuery();

  const initialValues: ControlRoomConfiguration = {
    controlRoomUrl: me?.organization?.control_room?.url ?? "",
    username: "",
    password: "",
  };

  return (
    <OnboardingChecklistCard title="Set up your account">
      <OnboardingStep
        number={1}
        title={
          isAccountUnlinked
            ? "Create or link a PixieBrix account"
            : "PixieBrix account created/linked"
        }
        active={isAccountUnlinked}
        completed={!isAccountUnlinked}
      >
        <Button
          role="button"
          className="btn btn-primary mt-2"
          href={installURL}
        >
          <FontAwesomeIcon icon={faLink} /> Create/link PixieBrix account
        </Button>
      </OnboardingStep>
      <OnboardingStep
        number={2}
        title="PixieBrix browser extension installed"
        completed
      />
      <OnboardingStep
        number={3}
        title="Connect your AARI account"
        active={!isAccountUnlinked && needsConfiguration}
        completed={!needsConfiguration}
        isLoading={isLoading}
      >
        <AutomationAnywhereTokenForm initialValues={initialValues} />
      </OnboardingStep>
    </OnboardingChecklistCard>
  );
};

export default PartnerSetupCard;
