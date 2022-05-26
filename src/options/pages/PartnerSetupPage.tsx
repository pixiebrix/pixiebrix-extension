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
import { useTitle } from "@/hooks/title";
import { Form, Row, Col, Button } from "react-bootstrap";
import OnboardingChecklistCard, {
  OnboardingStep,
} from "@/options/pages/onboarding/OnboardingChecklistCard";
import { useGetMeQuery } from "@/services/api";

const PartnerSetupPage: React.FunctionComponent = () => {
  useTitle("Connect your Automation Anywhere account");
  const { data: me } = useGetMeQuery();

  return (
    <Row className="w-100 mx-0">
      <Col className="mt-5 col-md-10 col-lg-7 col-sm-12 mx-auto">
        <OnboardingChecklistCard title="Set up your account">
          <OnboardingStep
            number={1}
            title="PixieBrix account created/linked"
            completed
          />
          <OnboardingStep
            number={2}
            title="PixieBrix browser extension installed"
            completed
          />
          <OnboardingStep number={3} title="Connect your AARI account" active>
            <Form>
              <Form.Group>
                <Form.Label>Control Room URL</Form.Label>
                <Form.Control
                  type="text"
                  value={me?.organization?.control_room?.url}
                />
              </Form.Group>
              <Form.Row>
                <Form.Group as={Col}>
                  <Form.Label>Username</Form.Label>
                  <Form.Control type="text" />
                </Form.Group>
                <Form.Group as={Col}>
                  <Form.Label>Password</Form.Label>
                  <Form.Control type="password" />
                </Form.Group>
              </Form.Row>
              <div className="text-right">
                <Button>Connect</Button>
              </div>
            </Form>
          </OnboardingStep>
        </OnboardingChecklistCard>
      </Col>
    </Row>
  );
};

export default PartnerSetupPage;
