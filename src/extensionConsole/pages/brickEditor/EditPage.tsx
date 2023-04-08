/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { PageTitle } from "@/layout/Page";
import { faHammer } from "@fortawesome/free-solid-svg-icons";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Button, Col, Form, Row } from "react-bootstrap";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Formik } from "formik";
import { useParams } from "react-router";
import Editor from "./Editor";
import { truncate } from "lodash";
import Loader from "@/components/Loader";
import useSubmitBrick from "./useSubmitBrick";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import { useTitle } from "@/hooks/title";
import { HotKeys } from "react-hotkeys";
import workshopSlice from "@/store/workshopSlice";
import useLogContext from "@/extensionConsole/pages/brickEditor/useLogContext";
import { loadBrickYaml } from "@/runtime/brickYaml";
import BooleanWidget from "@/components/fields/schemaFields/widgets/BooleanWidget";
import { type Package } from "@/types/contract";
import { useGetPackageQuery } from "@/services/api";
import { useIsMounted } from "@/hooks/common";
import { UnknownObject } from "@/types/objectTypes";
import { UUID } from "@/types/stringTypes";

const { touchBrick } = workshopSlice.actions;

type ParsedBrickInfo = {
  isBlueprint: boolean;
  isInstalled: boolean;
  config: UnknownObject;
};

function useParseBrick(config: string | null): ParsedBrickInfo {
  const extensions = useSelector(selectExtensions);

  return useMemo(() => {
    if (config == null) {
      return { isBlueprint: false, isInstalled: false, config: undefined };
    }

    const configJSON = loadBrickYaml(config) as UnknownObject;
    const isBlueprint = configJSON.kind === "recipe";
    if (isBlueprint) {
      return {
        isBlueprint: true,
        isInstalled: extensions.some(
          (x) => x._recipe?.id === configJSON.metadata?.id
        ),
        config: configJSON,
      };
    }

    return { isBlueprint: false, isInstalled: false, config: configJSON };
  }, [config, extensions]);
}

const LoadingBody: React.FC = () => (
  <>
    <div className="d-flex">
      <div className="flex-grow-1">
        <PageTitle icon={faHammer} title="Edit Brick" />
      </div>
      <div className="flex-grow-1 text-right">
        <Button disabled>Update Brick</Button>
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
 * Hook to mark the brick as touched in the Redux state (For showing recently edited bricks).
 */
function useTouchBrick(id: UUID): void {
  const dispatch = useDispatch();
  useEffect(() => {
    console.debug("Marking brick as touched: %s", id);
    dispatch(touchBrick({ id }));
  }, [dispatch, id]);
}

const EditForm: React.FC<{ id: UUID; data: Package }> = ({ id, data }) => {
  const {
    isBlueprint,
    isInstalled,
    config: rawConfig,
  } = useParseBrick(data.config);

  const { submit, validate, remove } = useSubmitBrick({
    create: false,
  });

  const isMounted = useIsMounted();

  const [isRemoving, setIsRemovingBrick] = useState(false);
  const onRemove = async () => {
    setIsRemovingBrick(true);
    await remove(id);

    // If the brick has been removed, the app will navigate away from this page,
    // so we need to check if the component is still mounted
    if (isMounted()) {
      setIsRemovingBrick(false);
    }
  };

  useLogContext(data.config);

  const name = rawConfig.metadata?.name;
  useTitle(name ? `Edit ${truncate(name, { length: 15 })}` : "Edit Brick");

  return (
    <HotKeys keyMap={keyMap}>
      <Formik
        onSubmit={submit}
        validate={validate}
        initialValues={{ ...data, reactivate: isBlueprint && isInstalled }}
      >
        {({ values, isValid, handleSubmit, isSubmitting }) => (
          <HotKeys
            handlers={{
              SAVE(keyEvent) {
                keyEvent.preventDefault();
                handleSubmit();
              },
            }}
          >
            <Form noValidate onSubmit={handleSubmit} autoComplete="off">
              <div className="d-flex">
                <div className="flex-grow-1">
                  <PageTitle icon={faHammer} title="Edit Brick" />
                </div>
                <div className="flex-grow-1 EditPage__toolbar">
                  <div className="d-flex justify-content-end">
                    {isBlueprint && isInstalled && (
                      <div className="mr-4 my-auto">
                        <BooleanWidget name="reactivate" />
                        <span className="ml-2">Re-activate Mod</span>
                      </div>
                    )}
                    <div>
                      <Button
                        disabled={!isValid || isSubmitting || isRemoving}
                        type="submit"
                      >
                        {values.public ? "Publish Brick" : "Update Brick"}
                      </Button>
                    </div>
                    <div>
                      <Button
                        disabled={isSubmitting || isRemoving}
                        variant="danger"
                        onClick={onRemove}
                      >
                        Delete Brick
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <Row>
                <Col className="mt-4">
                  <Editor />
                </Col>
              </Row>
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
  useTouchBrick(id);

  if (error) {
    throw error;
  }

  if (isFetching) {
    return <LoadingBody />;
  }

  return <EditForm id={id} data={data} />;
};

export default EditPage;
