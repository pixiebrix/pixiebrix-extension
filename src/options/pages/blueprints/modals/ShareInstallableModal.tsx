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

import { FormikWizard } from "formik-wizard-form";
import React from "react";
import { Button } from "react-bootstrap";

type ShareInstallableModalProps = {};

const ShareInstallableModal: React.FunctionComponent<
  ShareInstallableModalProps
> = (props) => {
  console.log("ShareInstallableModal");
  return (
    <FormikWizard
      initialValues={{
        firstName: "",
        lastName: "",
        username: "",
        password: "",
        email: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        employerName: "",
        designation: "",
        totalExperience: "",
        city: "",
      }}
      onSubmit={(values) => {
        console.log("submit", values);
      }}
      validateOnNext
      activeStepIndex={0}
      steps={[
        {
          component: () => <div>First step</div>,
          // validationSchema: {},
        },
        {
          component: () => <div>Second step</div>,
          // validationSchema: {},
        },
      ]}
    >
      {({
        currentStepIndex,
        renderComponent,
        handlePrev,
        handleNext,
        isNextDisabled,
        isPrevDisabled,
      }) => {
        return (
          <>
            Trololo
            {renderComponent()}
            <Button
              variant="secondary"
              disabled={isPrevDisabled}
              onClick={handlePrev}
            >
              Previous
            </Button>
            <Button
              variant="primary"
              disabled={isNextDisabled}
              onClick={handleNext}
            >
              {currentStepIndex === 1 ? "Finish" : "Next"}
            </Button>
          </>
        );
      }}
    </FormikWizard>
  );
};

export default ShareInstallableModal;
