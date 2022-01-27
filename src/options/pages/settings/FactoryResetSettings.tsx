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

import { Button, Card } from "react-bootstrap";
import browser from "webextension-polyfill";
import React from "react";
import { connect } from "react-redux";
import { useToasts } from "react-toast-notifications";
import { getErrorMessage } from "@/errors";
import extensionsSlice from "@/store/extensionsSlice";
import servicesSlice from "@/store/servicesSlice";

const { resetOptions } = extensionsSlice.actions;
const { resetServices } = servicesSlice.actions;

const FactoryResetSettings: React.FunctionComponent<{
  resetOptions: () => void;
}> = ({ resetOptions }) => {
  const { addToast } = useToasts();

  return (
    <Card border="danger">
      <Card.Header className="danger">Factory Reset</Card.Header>
      <Card.Body className="text-danger">
        <p className="card-text">
          Click here to reset your local PixieBrix data.{" "}
          <b>This will delete any bricks you&apos;ve installed.</b>
        </p>
        <Button
          variant="danger"
          onClick={async () => {
            try {
              resetOptions();
              await browser.contextMenus.removeAll();
              addToast("Reset all options and service configurations", {
                appearance: "success",
                autoDismiss: true,
              });
            } catch (error) {
              addToast(
                `Error resetting options and service configurations: ${getErrorMessage(
                  error
                )}`,
                {
                  appearance: "error",
                  autoDismiss: true,
                }
              );
            }
          }}
        >
          Factory Reset
        </Button>
      </Card.Body>
    </Card>
  );
};

export default connect(null, (dispatch) => ({
  resetOptions: () => {
    dispatch(resetOptions());
    dispatch(resetServices());
  },
}))(FactoryResetSettings);
