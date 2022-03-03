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

import styles from "./ShareExtensionModal.module.scss";

import React, { useCallback, useMemo } from "react";
import {
  Button,
  Modal,
  Col,
  Form as BootstrapForm,
  Row,
} from "react-bootstrap";
import { FormikHelpers } from "formik";
import { compact, isEmpty, pick, sortBy, uniq } from "lodash";
import { IExtension, RegistryId, UUID } from "@/core";
import * as Yup from "yup";
import { PACKAGE_REGEX } from "@/types/helpers";
import { useGetAuthQuery, useGetOrganizationsQuery } from "@/services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import slugify from "slugify";
import { getLinkedApiClient } from "@/services/apiClient";
import { objToYaml } from "@/utils/objToYaml";
import { makeBlueprint } from "@/options/pages/installed/exportBlueprint";
import { useDispatch, useSelector } from "react-redux";
import {
  RecipeDefinition,
  selectSourceRecipeMetadata,
} from "@/types/definitions";
import notify from "@/utils/notify";
import { push } from "connected-react-router";
import { getHumanDetail } from "@/hooks/useUserAction";
import { isAxiosError } from "@/errors";
import { faGlobe, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import Form, {
  OnSubmit,
  RenderBody,
  RenderStatus,
  RenderSubmit,
} from "@/components/form/Form";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { PackageUpsertResponse } from "@/types/contract";
import extensionsSlice from "@/store/extensionsSlice";
import SwitchButtonWidget from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import FieldTemplate from "@/components/form/FieldTemplate";
import { installedPageSlice } from "@/options/pages/installed/installedPageSlice";
import { selectExtensions } from "@/store/extensionsSelectors";
import { RequireScope } from "@/auth/RequireScope";

const { attachExtension } = extensionsSlice.actions;

type FormState = {
  blueprintId: RegistryId;
  name: string;
  description: string;
  public: boolean;
  organizations: UUID[];
};

const ShareSchema = Yup.object().shape({
  blueprintId: Yup.string()
    .matches(PACKAGE_REGEX, "Invalid registry id")
    .required(),
  name: Yup.string().required(),
  description: Yup.string().required(),
  public: Yup.boolean().required(),
  organizations: Yup.array().of(Yup.string().required()),
});

async function convertAndShare(
  extension: IExtension,
  form: FormState
): Promise<RecipeDefinition> {
  const client = await getLinkedApiClient();

  const blueprint = makeBlueprint(extension, {
    id: form.blueprintId,
    name: form.name,
    description: form.description,
    version: "1.0.0",
  });

  const { data } = await client.post<PackageUpsertResponse>("api/bricks/", {
    config: objToYaml(blueprint),
    kind: "recipe",
    public: form.public,
    organizations: form.organizations,
    share_dependencies: true,
  });

  return {
    ...blueprint,
    sharing: pick(data, ["public", "organizations"]),
    ...pick(data, ["updated_at"]),
  };
}

// XXX: this is a connected component. To simplify testing split out the presentational component
const ShareExtensionModal: React.FC<{
  extensionId: UUID;
}> = ({ extensionId }) => {
  const extensions = useSelector(selectExtensions);
  const dispatch = useDispatch();

  const extension = useMemo(() => {
    const extension = extensions.find((x) => x.id === extensionId);
    if (extension == null) {
      throw new Error(`No persisted extension exists with id: ${extensionId}`);
    }

    return extension;
  }, [extensions, extensionId]);

  const onCancel = () => {
    dispatch(installedPageSlice.actions.setShareContext(null));
  };

  // If loading the URL directly, there's a race condition if scope will be populated when the modal is mounted.
  // Not a priority to fix because user will, in general, come to the modal via the "Share" button on the main page
  const {
    data: { scope },
  } = useGetAuthQuery();
  const { data: organizations = [] } = useGetOrganizationsQuery();

  const initialValues: FormState = {
    blueprintId: compact([scope, slugify(extension.label).toLowerCase()]).join(
      "/"
    ) as RegistryId,
    name: extension.label,
    description: "Created with the PixieBrix Page Editor",
    organizations: [],
    public: false,
  };

  const handleShare: OnSubmit = useCallback(
    async (values: FormState, helpers: FormikHelpers<FormState>) => {
      try {
        const recipe: RecipeDefinition = await convertAndShare(
          extension,
          values
        );
        dispatch(
          attachExtension({
            extensionId: extension.id,
            recipeMetadata: selectSourceRecipeMetadata(recipe),
          })
        );
        notify.success("Converted/shared brick");

        // Hide the share modal
        dispatch(installedPageSlice.actions.setShareContext(null));

        dispatch(
          push(`/installed/link/${encodeURIComponent(recipe.metadata.id)}`)
        );
      } catch (error) {
        if (isAxiosError(error) && error.response.data.config) {
          helpers.setStatus(error.response.data.config);
          return;
        }

        notify.error({
          message: `Error converting/sharing brick: ${getHumanDetail(error)}`,

          error,
        });
      } finally {
        helpers.setSubmitting(false);
      }
    },
    [dispatch, extension]
  );

  const renderBody: RenderBody = ({ values, setFieldValue }) => (
    <div>
      <ConnectedFieldTemplate
        name="name"
        label="Name"
        description="A name for the blueprint"
      />
      <ConnectedFieldTemplate
        name="blueprintId"
        label="Registry Id"
        description={
          <span>
            A unique id for the blueprint.{" "}
            <i>Cannot be modified once shared.</i>
          </span>
        }
      />
      <ConnectedFieldTemplate
        name="description"
        label="Description"
        description="A short description of the blueprint"
      />

      <BootstrapForm.Group as={Row}>
        <Col sm="12" className="text-info">
          <FontAwesomeIcon icon={faInfoCircle} /> The blueprint&apos;s
          dependencies will automatically also be shared.
        </Col>
      </BootstrapForm.Group>

      <ConnectedFieldTemplate
        name="public"
        as={SwitchButtonWidget}
        description={
          // \u00A0 stands for &nbsp;
          values.public ? <i>Visible to all PixieBrix users</i> : "\u00A0"
        }
        label={
          <span>
            <FontAwesomeIcon icon={faGlobe} /> Public
          </span>
        }
      />

      {sortBy(organizations, (organization) => organization.name).map(
        (organization) => {
          const checked = values.organizations.includes(organization.id);
          return (
            <FieldTemplate
              key={organization.id}
              name={organization.id}
              as={SwitchButtonWidget}
              label={organization.name}
              value={checked}
              onChange={() => {
                const next = checked
                  ? values.organizations.filter(
                      (x: string) => x !== organization.id
                    )
                  : uniq([...values.organizations, organization.id]);
                setFieldValue("organizations", next);
              }}
            />
          );
        }
      )}
    </div>
  );

  const renderSubmit: RenderSubmit = ({ isSubmitting, isValid, values }) => (
    <Modal.Footer>
      <Button variant="link" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" disabled={!isValid || isSubmitting}>
        {values.public || !isEmpty(values.organizations) ? "Share" : "Convert"}
      </Button>
    </Modal.Footer>
  );

  const renderStatus: RenderStatus = ({ status }) => (
    <div className="text-danger mb-3">{status}</div>
  );

  return (
    <Modal show onHide={onCancel} dialogClassName={styles.dialog}>
      <Modal.Header>
        <Modal.Title>Share as Blueprint</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <RequireScope scopeSettingsDescription="To share a blueprint, you must first set an account alias for your PixieBrix account">
          <Form
            validationSchema={ShareSchema}
            initialValues={initialValues}
            onSubmit={handleShare}
            renderStatus={renderStatus}
            renderBody={renderBody}
            renderSubmit={renderSubmit}
          />
        </RequireScope>
      </Modal.Body>
    </Modal>
  );
};

export default ShareExtensionModal;
