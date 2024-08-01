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
import { type UUID } from "@/types/stringTypes";
import { Button, Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { selectShowShareContext } from "@/extensionConsole/pages/mods/modals/modModalsSelectors";
import { modModalsSlice } from "@/extensionConsole/pages/mods/modals/modModalsSlice";
import * as Yup from "yup";
import Form from "@/components/form/Form";
import { getErrorMessage } from "@/errors/errorHelpers";
import {
  useGetEditablePackagesQuery,
  useUpdateModDefinitionMutation,
} from "@/data/service/api";
import { type FormikHelpers } from "formik";
import notify from "@/utils/notify";
import { produce } from "immer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInfoCircle,
  faTimes,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import ReactSelect from "react-select";
import styles from "./ShareModals.module.scss";
import { isSingleObjectBadRequestError } from "@/errors/networkErrorHelpers";
import { useOptionalModDefinition } from "@/modDefinitions/modDefinitionHooks";
import ActivationLink from "@/activation/ActivationLink";
import createMenuListWithAddButton from "@/components/form/widgets/createMenuListWithAddButton";
import { type Option } from "@/components/form/widgets/SelectWidget";
import Loader from "@/components/Loader";
import useHasEditPermissions from "@/extensionConsole/pages/mods/modals/shareModals/useHasEditPermissions";
import ModOwnerLabel from "@/extensionConsole/pages/mods/modals/shareModals/ModOwnerLabel";
import useSortOrganizations from "@/extensionConsole/pages/mods/modals/shareModals/useSortOrganizations";
import { assertNotNullish } from "@/utils/nullishUtils";

type ShareModFormState = {
  organizations: UUID[];
};

const validationSchema = Yup.object().shape({
  organizations: Yup.array().of(Yup.string().required()),
});

const AddATeamMenuList = createMenuListWithAddButton(
  "https://app.pixiebrix.com/teams/create",
);

const ShareModModalBody: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const { blueprintId: modId = null } =
    useSelector(selectShowShareContext) ?? {};
  const organizationsForSelect = useSortOrganizations();
  const [updateModDefinition] = useUpdateModDefinitionMutation();
  const { data: editablePackages, isFetching: isFetchingEditablePackages } =
    useGetEditablePackagesQuery();
  const {
    data: modDefinition,
    isFetching: isFetchingModDefinition,
    refetch: refetchModDefinition,
  } = useOptionalModDefinition(modId);
  const hasEditPermissions = useHasEditPermissions(modId);

  const closeModal = () => {
    dispatch(modModalsSlice.actions.closeModal());
  };

  // If a mod component was just converted to a mod, the API request is likely be in progress and mod definition
  // will be null
  if (isFetchingModDefinition) {
    return (
      <Modal.Body>
        <Loader />
      </Modal.Body>
    );
  }

  assertNotNullish(modId, "modId is nullish");
  assertNotNullish(modDefinition, `modDefintion for modId ${modId} is nullish`);

  const initialValues: ShareModFormState = {
    organizations: modDefinition.sharing.organizations,
  };

  const saveSharing = async (
    formValues: ShareModFormState,
    helpers: FormikHelpers<ShareModFormState>,
  ) => {
    try {
      assertNotNullish(editablePackages, "editablePackages is nullish");

      const newModDefinition = produce(modDefinition, (draft) => {
        draft.sharing.organizations = formValues.organizations;
      });

      const packageId = editablePackages.find(
        (x) => x.name === newModDefinition.metadata.id,
      )?.id;

      assertNotNullish(
        packageId,
        `could not find packageId for mod definition metadata id: ${newModDefinition.metadata.id}`,
      );

      await updateModDefinition({
        packageId,
        modDefinition: newModDefinition,
      }).unwrap();

      notify.success("Shared mod");
      closeModal();
      refetchModDefinition();
    } catch (error) {
      if (
        isSingleObjectBadRequestError(error) &&
        Number(error.response?.data.config?.length) > 0
      ) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- see check above
        helpers.setStatus(error.response!.data.config!.join(" "));
        return;
      }

      const message = getErrorMessage(error);
      helpers.setStatus(message);

      notify.error({
        message,
        error,
      });
    } finally {
      helpers.setSubmitting(false);
    }
  };

  return (
    <>
      {hasEditPermissions ? (
        <Form
          validationSchema={validationSchema}
          initialValues={initialValues}
          onSubmit={saveSharing}
          renderStatus={({ status }) => (
            <div className="text-danger p-3">{status}</div>
          )}
          renderBody={({ values: valuesUntyped, setFieldValue }) => {
            const values = valuesUntyped as ShareModFormState;
            return (
              <Modal.Body>
                <ReactSelect
                  options={organizationsForSelect
                    .filter((x) => !values.organizations.includes(x.id))
                    .map(
                      (x) =>
                        ({
                          label: x.name,
                          value: x.id,
                        }) satisfies Option,
                    )}
                  onChange={(selected: Option) => {
                    setFieldValue("organizations", [
                      ...values.organizations,
                      selected.value,
                    ]);
                  }}
                  value={null}
                  placeholder="Add a team"
                  components={{
                    MenuList: AddATeamMenuList,
                  }}
                />

                <div className={styles.row}>
                  <ModOwnerLabel modId={modId} />
                  <span className="text-muted">Owner</span>
                </div>

                {organizationsForSelect
                  .filter((x) => values.organizations.includes(x.id))
                  .map((organization) => (
                    <div className={styles.row} key={organization.id}>
                      <span>
                        <FontAwesomeIcon icon={faUsers} /> {organization.name}
                      </span>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          const next = values.organizations.filter(
                            (x: string) => x !== organization.id,
                          );
                          setFieldValue("organizations", next);
                        }}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </Button>
                    </div>
                  ))}
              </Modal.Body>
            );
          }}
          renderSubmit={({ isValid, isSubmitting }) => (
            <Modal.Footer>
              <Button variant="link" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={
                  !isValid || isSubmitting || isFetchingEditablePackages
                }
              >
                Save and Close
              </Button>
            </Modal.Footer>
          )}
        />
      ) : (
        <Modal.Body>
          <div className="text-info my-3">
            <FontAwesomeIcon icon={faInfoCircle} /> You don&apos;t have
            permissions to change sharing
          </div>
          <div className={styles.row}>
            <ModOwnerLabel modId={modId} />
            <span className="text-muted">Owner</span>
          </div>
          {organizationsForSelect
            .filter((x) => modDefinition.sharing.organizations.includes(x.id))
            .map((organization) => (
              <div className={styles.row} key={organization.id}>
                <span>
                  <FontAwesomeIcon icon={faUsers} /> {organization.name}
                </span>
              </div>
            ))}
        </Modal.Body>
      )}
      <Modal.Body>
        <h4>Link to share:</h4>
        <p className="mb-1">
          People with access can activate the mod with this link
        </p>
        <ActivationLink modId={modId} />
      </Modal.Body>
    </>
  );
};

export default ShareModModalBody;
