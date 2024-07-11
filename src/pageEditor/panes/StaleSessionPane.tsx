/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import React, { useEffect } from "react";
import Centered from "@/components/Centered";
import Alert from "@/components/Alert";
import { Button } from "react-bootstrap";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { useDispatch } from "react-redux";

const StaleSessionPane: React.FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(editorActions.hideModal());
  }, [dispatch]);

  return (
    <Centered>
      <Alert variant="info">
        There were changes made in a different instance of the Page Editor.
        Reload this Page Editor to sync the changes.
      </Alert>
      <Button
        variant="primary"
        onClick={() => {
          location.reload();
        }}
      >
        Reload
      </Button>
    </Centered>
  );
};

export default StaleSessionPane;
