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

import React, { useContext, useEffect, useRef, useState } from "react";
import { useField } from "formik";
import { type Expression, type UUID } from "@/core";
import useDatabaseOptions from "@/hooks/useDatabaseOptions";
import DatabaseCreateModal from "./DatabaseCreateModal";
import { isExpression } from "@/runtime/mapArgs";
import SelectWidget, {
  type SelectLike,
  type Option,
} from "@/components/form/widgets/SelectWidget";
import createMenuListWithAddButton from "@/components/form/widgets/createMenuListWithAddButton";
import { makeTemplateExpression } from "@/runtime/expressionCreators";
import FieldRuntimeContext from "@/components/fields/schemaFields/FieldRuntimeContext";

const DatabaseWidget: React.FunctionComponent<{
  /**
   * The database Formik field name.
   */
  name: string;
}> = ({ name }) => {
  const [showModal, setShowModal] = useState(false);
  const [{ value }, , { setValue }] = useField<UUID | Expression>(name);
  const { allowExpressions } = useContext(FieldRuntimeContext);

  const { databaseOptions, isLoading: isLoadingDatabaseOptions } =
    useDatabaseOptions();

  const isMountedRef = useRef(true);
  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  const setDatabaseId = (databaseId: UUID) => {
    if (allowExpressions) {
      setValue(makeTemplateExpression("nunjucks", databaseId));
    } else {
      setValue(databaseId);
    }
  };

  const onModalClose = () => {
    if (!isMountedRef.current) {
      return;
    }

    setShowModal(false);
  };

  const onDatabaseCreated = (databaseId: UUID) => {
    if (!isMountedRef.current) {
      return;
    }

    onModalClose();
    setDatabaseId(databaseId);
  };

  return (
    <>
      <DatabaseCreateModal
        show={showModal}
        onClose={onModalClose}
        onDatabaseCreated={onDatabaseCreated}
      />

      <SelectWidget
        name={name}
        options={databaseOptions}
        isLoading={isLoadingDatabaseOptions}
        value={isExpression(value) ? value.__value__ : value}
        onChange={(event: React.ChangeEvent<SelectLike<Option<UUID>>>) => {
          setDatabaseId(event.target.value);
        }}
        components={{
          MenuList: createMenuListWithAddButton(() => {
            setShowModal(true);
          }),
        }}
      />
    </>
  );
};

export default DatabaseWidget;
