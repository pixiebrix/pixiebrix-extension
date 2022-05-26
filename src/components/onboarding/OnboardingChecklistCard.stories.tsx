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
import { ComponentStory, ComponentMeta } from "@storybook/react";
import OnboardingChecklistCard, {
  OnboardingStep,
} from "@/components/onboarding/OnboardingChecklistCard";

export default {
  title: "Onboarding/OnboardingChecklistCard",
  component: OnboardingChecklistCard,
} as ComponentMeta<typeof OnboardingChecklistCard>;

const Template: ComponentStory<typeof OnboardingChecklistCard> = (args) => (
  <OnboardingChecklistCard title="Setup steps">
    <OnboardingStep number={1} title="PixieBrix account created" completed>
      Let's get started.
    </OnboardingStep>
    <OnboardingStep
      number={2}
      title="Install the PixieBrix browser extension"
      active
    >
      <p>
        In the Chrome Web Store, click {'"'}Add Extension{'"'} and accept the
        permission prompt
      </p>
    </OnboardingStep>
    <OnboardingStep number={3} title="Celebrate">
      You did it!
    </OnboardingStep>
  </OnboardingChecklistCard>
);

export const Default = Template.bind({});
