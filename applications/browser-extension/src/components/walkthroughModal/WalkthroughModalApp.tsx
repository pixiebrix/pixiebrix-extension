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

import styles from "./WalkthroughModal.module.scss";

import { Button, Carousel, Col, Container, Modal, Row } from "react-bootstrap";
import React, { useEffect, useState } from "react";
import { closeWalkthroughModal } from "../../contentScript/messenger/api";
import { type Target } from "../../types/messengerTypes";
import { Events } from "../../telemetry/events";
import inspectContextMenuImage from "../../../img/inspect-context-menu.png";
import devtoolsShortcutWindowsImage from "../../../img/devtools-shortcut-windows.svg";
import devtoolsShortcutMacImage from "../../../img/devtools-shortcut-mac.svg";
import devtoolsDockingContextMenu from "../../../img/devtools-docking-context-menu.png";
import devtoolsToolbarScreenshot from "../../../img/devtools-pixiebrix-toolbar-screenshot.png";
import devtoolsPixieBrixToolbarTab from "../../../img/devtools-pixiebrix-toolbar-tab.png";
import devtoolsPixieBrixToolbarTabHidden from "../../../img/devtools-pixiebrix-toolbar-hidden.png";
import devtoolsDockBottomIcon from "../../../img/devtools-dock-bottom-icon.svg";
import cx from "classnames";
import { isMac } from "../../utils/browserUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons";
import reportEvent from "../../telemetry/reportEvent";
import { assertNotNullish } from "../../utils/nullishUtils";

type WalkthroughModalStep = {
  title: string;
  body: React.ReactNode;
};

const steps: WalkthroughModalStep[] = [
  {
    title: "Open the Page Editor to start building",
    body: (
      <>
        <Row>
          <Col>
            <img
              src={inspectContextMenuImage}
              alt="The right-click browser context menu with the 'Inspect' option included"
              className="img-fluid"
            />
          </Col>
          <Col>
            {isMac() ? (
              <img
                src={devtoolsShortcutMacImage}
                alt="Keyboard shortcut to open devtools on Mac systems: Command + Option + I"
              />
            ) : (
              <img
                src={devtoolsShortcutWindowsImage}
                alt="Keyboard shortcut to open devtools on Windows systems: Control + Shift + I"
              />
            )}
          </Col>
        </Row>
        <p className="mt-3">
          The Page Editor lives in the Chrome DevTools. You can open the
          DevTools in two different ways.
        </p>
        <ul className="mb-0">
          <li>Right click anywhere on the page and select “Inspect”</li>
          <li>Or, utilize the keyboard shortcut for your system</li>
        </ul>
      </>
    ),
  },
  {
    title: "Docking the DevTools",
    body: (
      <>
        <Row>
          <Col>
            <img
              src={devtoolsToolbarScreenshot}
              alt="DevTools toolbar with three-dot menu icon included"
              className="img-fluid"
            />
          </Col>
          <Col>
            <img
              src={devtoolsDockingContextMenu}
              alt="The context menu that will show after clicking the DevTools three-dot menu, with 'Dock Side' option included"
              className="img-fluid"
            />
          </Col>
        </Row>
        <p className="mt-3">
          Dock the DevTools to the bottom of the screen. The Page Editor is a
          powerful tool that needs a bit of room to work its magic.
        </p>
        <p className="mb-0">
          Click the ‘
          <FontAwesomeIcon
            icon={faEllipsisV}
            className="mx-1"
            title="Three-dot menu icon"
          />
          ’ menu in the top right of the DevTools
          <br />
          Select the ‘
          <img
            src={devtoolsDockBottomIcon}
            alt="DevTools dock bottom icon"
            width="16px"
          />
          ’ (third option) under ‘Dock side’
        </p>
      </>
    ),
  },
  {
    title: "Opening the Page Editor",
    body: (
      <>
        <img
          src={devtoolsPixieBrixToolbarTab}
          alt="DevTools toolbar with the PixieBrix tab included"
          className="mb-3 img-fluid"
        />
        <img
          src={devtoolsPixieBrixToolbarTabHidden}
          alt="DevTools toolbar with the PixieBrix tab included under the chevron icon"
          className="img-fluid"
        />
        <p className="mt-3 mb-0">
          Last step is to select the PixieBrix tab from the tab bar. If you
          don’t see the tab, it’s probably behind the double-chevron menu.
        </p>
      </>
    ),
  },
];

const WalkthroughModalApp: React.FunctionComponent = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const params = new URLSearchParams(location.search);
  const openerParam = params.get("opener");
  assertNotNullish(openerParam, "Can't find opener URL parameter");
  const opener = JSON.parse(openerParam) as Target;
  // eslint-disable-next-line security/detect-object-injection,@typescript-eslint/no-non-null-assertion -- steps are constants defined in this file, and logic will never allow this to go out of bounds
  const currentStep = steps[stepIndex]!;

  useEffect(() => {
    reportEvent(Events.PAGE_EDITOR_WALKTHROUGH_MODAL_VIEW, {
      stepNumber: stepIndex + 1,
      stepTitle: currentStep.title,
    });
  }, [currentStep.title, stepIndex]);

  return (
    <Modal
      backdrop={false}
      animation={false}
      show={true}
      onHide={() => {
        closeWalkthroughModal(opener);
      }}
      className={styles.root}
    >
      <Modal.Header className={styles.modalHeader} closeButton>
        <Container>
          <small>
            Step {stepIndex + 1} of {steps.length}
          </small>
          <Modal.Title>{currentStep.title}</Modal.Title>
        </Container>
      </Modal.Header>
      <Carousel
        activeIndex={stepIndex}
        interval={null}
        slide={false}
        controls={false}
        indicators={false}
      >
        {steps.map((step, index) => (
          // eslint-disable-next-line react/no-array-index-key -- The key *is* the index
          <Carousel.Item key={index}>
            <Modal.Body className="show-grid">
              <Container>{step.body}</Container>
            </Modal.Body>
          </Carousel.Item>
        ))}
      </Carousel>
      <Modal.Body className={cx("show-grid", styles.modalFooter)}>
        <Row>
          <Col>
            {stepIndex > 0 && (
              <Button
                size="sm"
                variant="link"
                onClick={() => {
                  if (stepIndex > 0) {
                    setStepIndex(stepIndex - 1);
                  }
                }}
              >
                Prev
              </Button>
            )}
          </Col>
          <Col>
            <ol
              className={cx(styles.carouselIndicators, "carousel-indicators")}
            >
              {steps.map((_, index) => (
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- Navigation can be done via prev/next buttons
                <li
                  // eslint-disable-next-line react/no-array-index-key -- The key *is* the index
                  key={index}
                  className={cx({ active: index === stepIndex })}
                  onClick={() => {
                    setStepIndex(index);
                  }}
                />
              ))}
            </ol>
          </Col>
          <Col className="d-flex justify-content-end">
            <Button
              size="sm"
              onClick={() => {
                if (stepIndex < steps.length - 1) {
                  setStepIndex(stepIndex + 1);
                } else {
                  closeWalkthroughModal(opener);
                }
              }}
            >
              {stepIndex < steps.length - 1 ? "Next" : "Close"}
            </Button>
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  );
};

export default WalkthroughModalApp;
