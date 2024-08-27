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

import styles from "./ActivateModCard.module.scss";

import React, { useState } from "react";
import { Button, Card } from "react-bootstrap";
import useActivateModWizard from "@/activation/useActivateModWizard";
import BlockFormSubmissionViaEnterIfFirstChild from "@/components/BlockFormSubmissionViaEnterIfFirstChild";
import { useDispatch } from "react-redux";
import { useCreateMilestoneMutation } from "@/data/service/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCubes, faMagic } from "@fortawesome/free-solid-svg-icons";
import useActivateMod from "@/activation/useActivateMod";
import useMilestones from "@/hooks/useMilestones";
import Form, { type OnSubmit, type RenderBody } from "@/components/form/Form";
import { type WizardValues } from "@/activation/wizardTypes";
import Alert from "@/components/Alert";
import notify from "@/utils/notify";
import modsPageSlice from "@/extensionConsole/pages/mods/modsPageSlice";
import { MODS_PAGE_TABS } from "@/extensionConsole/pages/mods/ModsPageSidebar";
import { push } from "connected-react-router";
import Loader from "@/components/Loader";
import WizardValuesModIntegrationsContextAdapter from "@/activation/WizardValuesModIntegrationsContextAdapter";
import Markdown from "@/components/Markdown";
import { getModActivationInstructions } from "@/utils/modUtils";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { isInternalRegistryId } from "@/utils/registryUtils";
import { assertNotNullish } from "@/utils/nullishUtils";
import { Milestones } from "@/data/model/UserMilestone";
import MarketplaceListingIcon from "@/components/MarketplaceListingIcon";

const WizardHeader: React.VoidFunctionComponent<{
  mod: ModDefinition;
  isReactivate: boolean;
  isSubmitting: boolean;
}> = ({ mod, isReactivate, isSubmitting }) => (
  <>
    <div className={styles.wizardHeaderLayout}>
      <div className={styles.wizardMainInfo}>
        <span className={styles.blueprintIcon}>
          <MarketplaceListingIcon
            packageId={mod.metadata.id}
            defaultIcon={faCubes}
          />
        </span>
        <span>
          <Card.Title>{mod.metadata.name}</Card.Title>
          {!isInternalRegistryId(mod.metadata.id) && (
            <code className={styles.packageId}>{mod.metadata.id}</code>
          )}
        </span>
      </div>
      <div className={styles.wizardDescription}>{mod.metadata.description}</div>
    </div>
    <div className={styles.activateButtonContainer}>
      <Button className="text-nowrap" type="submit" disabled={isSubmitting}>
        <FontAwesomeIcon icon={faMagic} />{" "}
        {isReactivate ? "Reactivate" : "Activate"}
      </Button>
    </div>
  </>
);

const ActivateModCard: React.FC<{
  modDefinition: ModDefinition;
  isReactivate: boolean;
}> = ({ modDefinition, isReactivate }) => {
  const dispatch = useDispatch();

  const {
    data: wizardState,
    isLoading: isLoadingWizard,
    error: wizardError,
  } = useActivateModWizard(modDefinition);

  const activateMod = useActivateMod("extensionConsole");
  const [activationError, setActivationError] = useState<unknown>();
  const [createMilestone] = useCreateMilestoneMutation();

  const { hasMilestone } = useMilestones();

  if (isLoadingWizard) {
    return <Loader />;
  }

  if (wizardError) {
    throw wizardError as Error;
  }

  assertNotNullish(wizardState, "wizardState is nullish");

  const { wizardSteps, initialValues, validationSchema } = wizardState;

  const instructions = getModActivationInstructions(modDefinition);

  const renderBody: RenderBody = ({ isSubmitting }) => (
    <WizardValuesModIntegrationsContextAdapter>
      <BlockFormSubmissionViaEnterIfFirstChild />
      <Card>
        <Card.Header className={styles.wizardHeader}>
          <WizardHeader
            mod={modDefinition}
            isReactivate={isReactivate}
            isSubmitting={isSubmitting}
          />
        </Card.Header>
        <Card.Body className={styles.wizardBody}>
          {activationError && <Alert variant="danger">{activationError}</Alert>}

          {instructions && (
            <div>
              <h4>Activation Instructions</h4>
              <Markdown markdown={instructions} />
            </div>
          )}

          {wizardSteps.map(({ Component, label, key }) => (
            <div key={key} className={styles.wizardBodyRow}>
              <div>
                <h4>{label}</h4>
              </div>
              <Component mod={modDefinition} />
            </div>
          ))}
        </Card.Body>
      </Card>
    </WizardValuesModIntegrationsContextAdapter>
  );

  const onSubmit: OnSubmit<WizardValues> = async (values) => {
    const { success, error } = await activateMod(values, modDefinition);

    if (success) {
      notify.success(`Activated ${modDefinition.metadata.name}`);

      if (!hasMilestone(Milestones.FIRST_TIME_PUBLIC_MOD_ACTIVATION)) {
        await createMilestone({
          milestoneName: Milestones.FIRST_TIME_PUBLIC_MOD_ACTIVATION,
          metadata: {
            blueprintId: modDefinition.metadata.id,
          },
        });

        dispatch(modsPageSlice.actions.setActiveTab(MODS_PAGE_TABS.getStarted));
      }

      dispatch(push("/mods"));
    } else {
      setActivationError(error);
    }
  };

  return (
    <Form
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
      renderBody={renderBody}
      renderSubmit={() => null}
    />
  );
};

export default ActivateModCard;
