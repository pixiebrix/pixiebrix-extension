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

import React, { useEffect, useMemo, useState } from "react";
import { PageTitle } from "../../../layout/Page";
import { faHammer } from "@fortawesome/free-solid-svg-icons";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Button, Form } from "react-bootstrap";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Formik } from "formik";
import { useParams } from "react-router";
import Editor from "./Editor";
import { truncate } from "lodash";
import Loader from "../../../components/Loader";
import useSubmitPackage from "./useSubmitPackage";
import { useDispatch, useSelector } from "react-redux";
import useSetDocumentTitle from "../../../hooks/useSetDocumentTitle";
import { HotKeys } from "react-hotkeys";
import workshopSlice from "../../../store/workshopSlice";
import useLogContext from "./useLogContext";
import { loadBrickYaml } from "../../../runtime/brickYaml";
import BooleanWidget from "../../../components/fields/schemaFields/widgets/BooleanWidget";
import { type Package } from "../../../types/contract";
import { useGetPackageQuery } from "../../../data/service/api";
import useIsMounted from "../../../hooks/useIsMounted";
import { type UUID } from "../../../types/stringTypes";
import { type Definition, DefinitionKinds } from "../../../types/registryTypes";
import { assertNotNullish } from "../../../utils/nullishUtils";
import castError from "../../../utils/castError";
import { selectModInstanceMap } from "../../../store/modComponents/modInstanceSelectors";

const { touchPackage } = workshopSlice.actions;

type ParsedPackageInfo = {
  isMod: boolean;
  isActivated: boolean;
  config?: Definition;
};

function useParsePackage(config: string | null): ParsedPackageInfo {
  const modInstanceMap = useSelector(selectModInstanceMap);

  return useMemo(() => {
    if (config == null) {
      return { isMod: false, isActivated: false, config: undefined };
    }

    const configJSON = loadBrickYaml(config) as Definition;
    const isBlueprint = configJSON.kind === DefinitionKinds.MOD;
    if (isBlueprint) {
      return {
        isMod: true,
        isActivated: modInstanceMap.has(configJSON.metadata?.id),
        config: configJSON,
      };
    }

    return { isMod: false, isActivated: false, config: configJSON };
  }, [config, modInstanceMap]);
}

const LoadingBody: React.FC = () => (
  <>
    <div className="d-flex">
      <div className="flex-grow-1">
        <PageTitle icon={faHammer} title="Edit Package" />
      </div>
      <div className="flex-grow-1 text-right">
        <Button disabled>Update Package</Button>
      </div>
    </div>
    <div>
      <Loader />
    </div>
  </>
);

const keyMap = {
  SAVE: "command+s",
};

/**
 * Hook to mark the package as touched in the Redux state (For showing recently edited packages).
 */
function useTouchPackage(packageId: UUID): void {
  const dispatch = useDispatch();
  useEffect(() => {
    console.debug("Marking package as touched: %s", packageId);
    dispatch(touchPackage({ id: packageId }));
  }, [dispatch, packageId]);
}

const EditForm: React.FC<{ id: UUID; data: Package }> = ({ id, data }) => {
  const {
    isMod,
    isActivated,
    config: rawConfig,
  } = useParsePackage(data.config);

  const name = rawConfig?.metadata?.name;

  const { submit, validate, remove } = useSubmitPackage({
    create: false,
  });

  const isMounted = useIsMounted();

  const [isRemoving, setIsRemovingPackage] = useState(false);
  const onRemove = async () => {
    assertNotNullish(remove, "Remove function is not set");
    setIsRemovingPackage(true);
    await remove({ id, name });

    // If the brick has been removed, the app will navigate away from this page,
    // so we need to check if the component is still mounted
    if (isMounted()) {
      setIsRemovingPackage(false);
    }
  };

  useLogContext(data.config);

  useSetDocumentTitle(
    name ? `Edit ${truncate(name, { length: 15 })}` : "Edit Package",
  );

  return (
    <HotKeys keyMap={keyMap}>
      <Formik
        onSubmit={submit}
        validate={validate}
        initialValues={{ ...data, reactivate: isMod && isActivated }}
      >
        {({ values, isValid, handleSubmit, isSubmitting }) => (
          <HotKeys
            handlers={{
              SAVE(keyEvent) {
                keyEvent?.preventDefault();
                handleSubmit();
              },
            }}
          >
            <Form noValidate onSubmit={handleSubmit} autoComplete="off">
              <div className="d-flex">
                <div className="flex-grow-1">
                  <PageTitle
                    icon={faHammer}
                    title="Edit Package"
                    documentationUrl="https://docs.pixiebrix.com/developing-mods/advanced-workshop"
                  />
                </div>
                <div className="flex-grow-1 EditPage__toolbar">
                  <div className="d-flex justify-content-end">
                    {isMod && isActivated && (
                      <div className="mr-4 my-auto">
                        <BooleanWidget
                          name="reactivate"
                          schema={{ type: "boolean" }}
                        />
                        <span className="ml-2">Re-activate Mod</span>
                      </div>
                    )}
                    <Button
                      disabled={!isValid || isSubmitting || isRemoving}
                      type="submit"
                    >
                      {values.public ? "Publish Package" : "Update Package"}
                    </Button>
                    <Button
                      disabled={isSubmitting || isRemoving}
                      variant="danger"
                      onClick={onRemove}
                    >
                      Delete Package
                    </Button>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Editor />
              </div>
            </Form>
          </HotKeys>
        )}
      </Formik>
    </HotKeys>
  );
};

const EditPage: React.FC = () => {
  const { id } = useParams<{ id: UUID }>();
  const { data, isFetching, error } = useGetPackageQuery({ id });

  // Can mark the brick as recently opened even if it errors on load
  useTouchPackage(id);

  if (error) {
    throw castError(error, "Error loading package data");
  }

  if (isFetching) {
    return <LoadingBody />;
  }

  assertNotNullish(data, "Package data is nullish");

  return <EditForm id={id} data={data} />;
};

export default EditPage;
