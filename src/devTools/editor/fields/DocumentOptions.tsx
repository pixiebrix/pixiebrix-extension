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

import React, { Suspense } from "react";
import { validateRegistryId } from "@/types/helpers";
import { isPlainObject, partial } from "lodash";
import { joinName } from "@/utils";
import { useField } from "formik";
import AceEditor from "@/vendors/AceEditor";
import { UnknownObject } from "@/types";

export const DOCUMENT_ID = validateRegistryId("@pixiebrix/document");

const DocumentOptions: React.FC<{
  name: string;
  configKey: string;
}> = ({ name, configKey }) => {
  const configName = partial(joinName, name, configKey);
  const [{ value }, , { setValue }] = useField<string | UnknownObject>(
    configName("body")
  );

  if (isPlainObject(value)) {
    return <div>Edit in the workshop</div>;
  }

  return (
    <Suspense fallback={<div className="text-muted">Loading...</div>}>
      <AceEditor
        value={value as string}
        onChange={setValue}
        mode="yaml"
        theme="chrome"
        width="100%"
        name="ACE_EDITOR_DIV"
      />
    </Suspense>
  );
};

export default DocumentOptions;
