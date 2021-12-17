/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { FormEntry } from "@/actionPanel/actionPanelTypes";
import { useAsyncState } from "@/hooks/common";
import GridLoader from "react-spinners/GridLoader";
import { getErrorMessage } from "@/errors";
import { createFrameSource } from "@/blocks/transformers/ephemeralForm/formTransformer";

type FormBodyProps = {
  form: FormEntry;
};

/**
 * JSON Schema form for embedding in an action panel tab
 * @param form the form definition and extension metadata
 * @constructor
 */
const FormBody: React.FunctionComponent<FormBodyProps> = ({ form }) => {
  const [sourceURL, isLoading, error] = useAsyncState(
    async () => createFrameSource(form.nonce, "panel"),
    [form.nonce]
  );

  if (isLoading) {
    return (
      <div>
        <GridLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-danger">
        Error getting information for form: {getErrorMessage(error)}
      </div>
    );
  }

  return (
    <iframe
      title={form.nonce}
      height="100%"
      width="100%"
      src={sourceURL.toString()}
      style={{ border: "none" }}
      allowFullScreen={false}
    />
  );
};

export default FormBody;
