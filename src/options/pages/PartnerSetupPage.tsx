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

import React, { useMemo } from "react";
import { useTitle } from "@/hooks/title";
import { Form, Row, Col, Button } from "react-bootstrap";
import OnboardingChecklistCard, {
  OnboardingStep,
} from "@/options/pages/onboarding/OnboardingChecklistCard";
import { useGetMeQuery } from "@/services/api";
import servicesSlice from "@/store/servicesSlice";
import { uuidv4 } from "@/types/helpers";
import { Formik } from "formik";
import { GridLoader } from "react-spinners";
import notify from "@/utils/notify";
import { persistor } from "@/options/store";
import { services } from "@/background/messenger/api";
import { useDispatch } from "react-redux";

const CONTROL_ROOM_SERVICE_ID = "automation-anywhere/control-room";

type ControlRoomConfiguration = {
  controlRoomUrl: string;
  username: string;
  password: string;
};

const AutomationAnywhereControlRoomForm: React.FunctionComponent<{
  initialValues: ControlRoomConfiguration;
}> = ({ initialValues }) => {
  const { updateServiceConfig } = servicesSlice.actions;
  const dispatch = useDispatch();

  const handleSubmit = async (formValues: ControlRoomConfiguration) => {
    dispatch(
      updateServiceConfig({
        id: uuidv4(),
        serviceId: CONTROL_ROOM_SERVICE_ID,
        label: "My AA Control Room Configuration",
        config: formValues,
      })
    );

    notify.success("Successfully set up PixieBrix!");

    await persistor.flush();

    try {
      await services.refresh();
    } catch (error) {
      notify.error({
        message:
          "Error refreshing service configurations, restart the PixieBrix extension",
        error,
      });
    }
  };

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {({ handleSubmit, values, handleChange }) => (
        <Form onSubmit={handleSubmit}>
          <Form.Group>
            <Form.Label>Control Room URL</Form.Label>
            <Form.Control
              type="text"
              name="controlRoomUrl"
              value={values.controlRoomUrl}
              onChange={handleChange}
            />
          </Form.Group>
          <Form.Row>
            <Form.Group as={Col}>
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                name="username"
                value={values.username}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group as={Col}>
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={values.password}
                onChange={handleChange}
              />
            </Form.Group>
          </Form.Row>
          <div className="text-right">
            <Button type="submit">Connect</Button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

const PartnerSetupPage: React.FunctionComponent = () => {
  useTitle("Connect your Automation Anywhere account");
  const { data: me, isLoading } = useGetMeQuery();

  const initialValues: ControlRoomConfiguration = {
    controlRoomUrl: me?.organization?.control_room?.url ?? "",
    username: "",
    password: "",
  };

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
            {isLoading ? (
              <GridLoader />
            ) : (
              <AutomationAnywhereControlRoomForm
                initialValues={initialValues}
              />
            )}
          </OnboardingStep>
        </OnboardingChecklistCard>
      </Col>
    </Row>
  );
};

export default PartnerSetupPage;
