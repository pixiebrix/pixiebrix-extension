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

import React from "react";
import { useDispatch } from "react-redux";
import { editorSlice } from "@/pageEditor/store/editor/editorSlice";
import home from "@img/home.svg";

import styles from "./HomeButton.module.scss";
import { Button } from "react-bootstrap";

const HomeButton: React.FunctionComponent = () => {
  const dispatch = useDispatch();

  return (
    <Button
      size="sm"
      className={styles.button}
      title="Home"
      onClick={() => {
        dispatch(editorSlice.actions.showHomePane());
      }}
    >
      <img src={home} alt="Return to Page Editor Home" />
    </Button>
  );
};

export default HomeButton;
