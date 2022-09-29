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

import React, { useEffect, useRef, useState } from "react";
import { useField } from "formik";
import { Expression, UUID } from "@/core";
import useDatabaseOptions from "@/pageEditor/hooks/useDatabaseOptions";
import DatabaseCreateModal from "@/pageEditor/fields/DatabaseCreateModal";
import { isExpression } from "@/runtime/mapArgs";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import createMenuListWithAddButton from "@/components/form/widgets/createMenuListWithAddButton";
import { makeTemplateExpression } from "@/testUtils/expressionTestHelpers";

const DatabaseWidget: React.FunctionComponent<{
  /**
   * The database Formik field name.
   */
  name: string;
}> = ({ name }) => {
  const [showModal, setShowModal] = useState(false);
  const [{ value: databaseId }, , { setValue: setDatabaseId }] = useField<
    UUID | Expression
  >(name);

  const { databaseOptions, isLoading: isLoadingDatabaseOptions } =
    useDatabaseOptions();

  const isMountedRef = useRef(true);
  useEffect(() => {
    if (typeof databaseId === "string") {
      setDatabaseId(makeTemplateExpression("nunjucks", databaseId));
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
    setDatabaseId(makeTemplateExpression("nunjucks", databaseId));
  };

  console.log("DatabaseField2. render");

  return (
    <>
      {showModal && (
        <DatabaseCreateModal
          onClose={onModalClose}
          onDatabaseCreated={onDatabaseCreated}
        />
      )}

      <SelectWidget
        name={name}
        options={databaseOptions}
        isLoading={isLoadingDatabaseOptions}
        value={isExpression(databaseId) ? databaseId.__value__ : databaseId}
        onChange={(event) => {
          setDatabaseId(makeTemplateExpression("nunjucks", event.target.value));
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
