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

const Template: ComponentStory<typeof OnboardingChecklistCard> = () => (
  <OnboardingChecklistCard title="Onboarding checklist demo">
    <OnboardingStep
      number={1}
      title="This is a completed task, it collapses"
      completed
    >
      <p>The body of this step is hidden when completed</p>
    </OnboardingStep>
    <OnboardingStep number={2} title="This is an active step" active>
      <p>
        You can put whatever you want in me! The content of the completed and
        future steps will be collapsed.
      </p>
    </OnboardingStep>
    <OnboardingStep number={3} title="This is a future task, it also collapses">
      <p>The body of this step is also hidden!</p>
    </OnboardingStep>
  </OnboardingChecklistCard>
);

export const Default = Template.bind({});
