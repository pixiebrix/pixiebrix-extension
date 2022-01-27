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

import React, { useEffect, useMemo } from "react";
import { PageTitle } from "@/layout/Page";
import { faHammer } from "@fortawesome/free-solid-svg-icons";
import { Button, Col, Form, Row } from "react-bootstrap";
import { Formik, useField } from "formik";
import { useParams } from "react-router";
import Editor from "./Editor";
import { truncate } from "lodash";
import GridLoader from "react-spinners/GridLoader";
import useSubmitBrick from "./useSubmitBrick";
import BootstrapSwitchButton from "bootstrap-switch-button-react";
import "./EditPage.scss";
import { useDispatch, useSelector } from "react-redux";
import { RawConfig } from "@/core";
import { selectExtensions } from "@/store/extensionsSelectors";
import { useTitle } from "@/hooks/title";
import { HotKeys } from "react-hotkeys";
import workshopSlice from "@/store/workshopSlice";
import useLogContext from "@/options/pages/brickEditor/useLogContext";
import useFetch from "@/hooks/useFetch";
import { loadBrickYaml } from "@/runtime/brickYaml";

const { touchBrick } = workshopSlice.actions;

interface BrickData {
  id: string;
  config: string;
  organizations: string[];
  public: boolean;
}

type ParsedBrickInfo = {
  isBlueprint: boolean;
  isInstalled: boolean;
  config: RawConfig;
};

function useParseBrick(config: string | null): ParsedBrickInfo {
  const extensions = useSelector(selectExtensions);

  return useMemo(() => {
    if (config == null) {
      return { isBlueprint: false, isInstalled: false, config: undefined };
    }

    const configJSON = loadBrickYaml(config) as RawConfig;
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

const ToggleField: React.FunctionComponent<{ name: string }> = ({ name }) => {
  const [field, , helpers] = useField(name);
  return (
    <BootstrapSwitchButton
      onstyle="info"
      offstyle="light"
      onlabel=" "
      offlabel=" "
      checked={field.value}
      onChange={(value) => {
        helpers.setValue(value);
      }}
    />
  );
};

const LoadingBody: React.FunctionComponent = () => (
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
      <GridLoader />
    </div>
  </>
);

const keyMap = {
  SAVE: "command+s",
};

function useTouchBrick(id: string): void {
  const dispatch = useDispatch();
  useEffect(() => {
    console.debug("Marking brick as touched: %s", id);
    dispatch(touchBrick({ id }));
  }, [dispatch, id]);
}

const EditPage: React.FunctionComponent = () => {
  const { id } = useParams<{ id: string }>();

  const url = `api/bricks/${id}/`;

  const { data } = useFetch<BrickData>(url);

  const { isBlueprint, isInstalled, config: rawConfig } = useParseBrick(
    data?.config
  );

  useTouchBrick(id);

  const { submit, validate, remove } = useSubmitBrick({ url, create: false });

  const logContext = useLogContext(data?.config);

  const name = rawConfig?.metadata?.name;
  const title = useMemo(
    () => (name ? `Edit ${truncate(name, { length: 15 })}` : "Edit Brick"),
    [name]
  );
  useTitle(title);

  if (!data) {
    return <LoadingBody />;
  }

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
              SAVE: (keyEvent) => {
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
                        <ToggleField name="reactivate" />
                        <span className="ml-2">Re-activate Blueprint</span>
                      </div>
                    )}
                    <div>
                      <Button disabled={!isValid || isSubmitting} type="submit">
                        {values.public ? "Publish Brick" : "Update Brick"}
                      </Button>
                    </div>
                    <div>
                      <Button
                        disabled={isSubmitting}
                        variant="danger"
                        onClick={remove}
                      >
                        Delete Brick
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <Row>
                <Col className="mt-4">
                  <Editor logContext={logContext} />
                </Col>
              </Row>
            </Form>
          </HotKeys>
        )}
      </Formik>
    </HotKeys>
  );
};

export default EditPage;
