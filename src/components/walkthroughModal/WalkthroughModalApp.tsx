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

import styles from "./WalkthroughModal.module.scss";

import { Button, Carousel, Col, Container, Modal, Row } from "react-bootstrap";
import React, { useState } from "react";
import { expectContext } from "@/utils/expectContext";
import { showModal } from "@/bricks/transformers/ephemeralForm/modalUtils";
import { getThisFrame } from "webext-messenger";
import { registerWalkthroughModal } from "@/contentScript/walkthroughModalProtocol";
import { closeWalkthroughModal } from "@/contentScript/messenger/api";
import { Target } from "@/types/messengerTypes";
import inspectContextMenuImage from "@img/inspect-context-menu.svg";
import devtoolsShortcutWindowsImage from "@img/devtools-shortcut-windows.svg";
import devtoolsShortcutMacImage from "@img/devtools-shortcut-mac.svg";
import devtoolsDockingContextMenu from "@img/devtools-docking-context-menu.svg";
import devtoolsToolbarScreenshot from "@img/devtools-toolbar-screenshot.svg";
import devtoolsPixieBrixToolbarTab from "@img/devtools-pixiebrix-toolbar-tab.svg";
import devtoolsPixieBrixToolbarTabHidden from "@img/devtools-pixiebrix-toolbar-tab-hidden.svg";
import devtoolsDockBottomIcon from "@img/devtools-dock-bottom-icon.svg";

import cx from "classnames";
import { isMac } from "@/utils/browserUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons";

let controller: AbortController;

type WalkthroughModalStep = {
  title: string;
  body: React.ReactNode;
};

export const WalkthroughModalApp: React.FunctionComponent = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const params = new URLSearchParams(location.search);
  const opener = JSON.parse(params.get("opener")) as Target;

  const steps: WalkthroughModalStep[] = [
    {
      title: "Opening the Chrome DevTools",
      body: (
        <>
          <p>
            The Page Editor lives in the Chrome DevTools. You can open the
            DevTools in two different ways.
          </p>
          <Row>
            <Col>
              <img src={inspectContextMenuImage} alt="" />
            </Col>
            <Col>
              {isMac() ? (
                <img src={devtoolsShortcutMacImage} alt="" />
              ) : (
                <img src={devtoolsShortcutWindowsImage} alt="" />
              )}
            </Col>
          </Row>
          <Row>
            <Col>
              <p className="mt-3 mb-0">
                Right click anywhere on the page and select “Inspect”
              </p>
            </Col>
            <Col>
              <p className="mt-3 mb-0">
                Or, utilize the keyboard shortcut for your system
              </p>
            </Col>
          </Row>
        </>
      ),
    },
    {
      title: "Docking the DevTools",
      body: (
        <>
          <p>
            Dock the DevTools to the bottom of the screen, if necessary. The
            Page Editor is a powerful tool that needs a bit of room to work its
            magic.
          </p>
          <Row>
            <Col>
              <img
                src={devtoolsToolbarScreenshot}
                alt="Screenshot of DevTools toolbar with three-dot menu icon"
              />
            </Col>
            <Col>
              <img
                src={devtoolsDockingContextMenu}
                alt="Screenshot of the context menu that will show after clicking the DevTools three-dot menu, with 'Dock Side' option included"
              />
            </Col>
          </Row>
          <p className="mt-3 mb-0">
            Click the ‘<FontAwesomeIcon icon={faEllipsisV} className="mx-1" />’
            menu in the top right of the DevTools
          </p>{" "}
          <p>
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
          <img src={devtoolsPixieBrixToolbarTab} alt="" className="mb-3" />
          <img src={devtoolsPixieBrixToolbarTabHidden} alt="" />
          <p className="mt-3 mb-0">
            Last step is to select the PixieBrix tab from the tab bar. If you
            don’t see the tab, it's probably behind the double-chevron menu.
          </p>
        </>
      ),
    },
  ];

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
      <Modal.Header closeButton>
        <Container>
          <small>
            Step {stepIndex + 1} of {steps.length}
          </small>
          <Modal.Title>{steps[stepIndex].title}</Modal.Title>
        </Container>
      </Modal.Header>
      <Carousel
        activeIndex={stepIndex}
        interval={null}
        slide={false}
        controls={false}
        indicators={false}
      >
        {steps.map((step, index) => {
          return (
            <Carousel.Item key={index}>
              <Modal.Body className="show-grid">
                <Container>{step.body}</Container>
              </Modal.Body>
            </Carousel.Item>
          );
        })}
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
              {steps.map((_, index) => {
                return (
                  <li
                    key={index}
                    className={cx({ active: index === stepIndex })}
                    onClick={() => {
                      setStepIndex(index);
                    }}
                  />
                );
              })}
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

export const showWalkthroughModal = async () => {
  expectContext("contentScript");

  controller = new AbortController();
  const target = await getThisFrame();

  const frameSource = new URL(browser.runtime.getURL("walkthroughModal.html"));
  frameSource.searchParams.set("opener", JSON.stringify(target));

  const modal = registerWalkthroughModal();
  showModal({ url: frameSource, controller });

  try {
    await modal;
  } finally {
    controller.abort();
  }
};
