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
import { useFormikContext } from "formik";
import React from "react";
import { Tab } from "react-bootstrap";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import styles from "./BlueprintOptionsTab.module.scss";

const BlueprintOptionsTab: React.VoidFunctionComponent<{
  eventKey: string;
}> = ({ eventKey }) => {
  const {
    values: formState,
    setValues: setFormState,
  } = useFormikContext<FormState>();

  console.log("BlueprintOptionsTab", { formState });

  return (
    <Tab.Pane eventKey={eventKey} className={styles.root}>
      <div>Editing Options for Blueprint "{formState.recipe.name}"</div>
    </Tab.Pane>
  );
};

export default BlueprintOptionsTab;
