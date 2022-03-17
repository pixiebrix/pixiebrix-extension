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
import React from "react";
import { connect } from "react-redux";
import notify from "@/utils/notify";
import extensionsSlice from "@/store/extensionsSlice";
import servicesSlice from "@/store/servicesSlice";

const { resetOptions } = extensionsSlice.actions;
const { resetServices } = servicesSlice.actions;

const FactoryResetSettings: React.FunctionComponent<{
  resetOptions: () => void;
}> = ({ resetOptions }) => (
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
            notify.success("Reset all options and service configurations");
          } catch (error) {
            notify.error({
              message: "Error resetting options and service configurations",
              error,
            });
          }
        }}
      >
        Factory Reset
      </Button>
    </Card.Body>
  </Card>
);

export default connect(null, (dispatch) => ({
  resetOptions() {
    dispatch(resetOptions());
    dispatch(resetServices());
  },
}))(FactoryResetSettings);
