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
import { type FormPanelEntry } from "@/types/sidebarTypes";
import useAsyncState from "@/hooks/useAsyncState";
import Loader from "@/components/Loader";
import EphemeralForm from "@/bricks/transformers/ephemeralForm/EphemeralForm";
import { getConnectedTarget } from "./connectedTarget";

type FormBodyProps = {
  form: FormPanelEntry;
};

/**
 * JSON Schema form for embedding in a sidebar tab
 * @param form the form definition and extension metadata
 * @constructor
 */
const FormBody: React.FunctionComponent<FormBodyProps> = ({ form }) => {
  const { data: target } = useAsyncState(getConnectedTarget, []);
  if (!form.nonce || !target) {
    return (
      <div>
        <Loader />
      </div>
    );
  }

  return <EphemeralForm nonce={form.nonce} opener={target} />;
};

export default FormBody;
