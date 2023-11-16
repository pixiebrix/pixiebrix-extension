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
import { registerModal } from "@/contentScript/walkthroughModalProtocol";
import { closeWalkthroughModal } from "@/contentScript/messenger/api";
import { Target } from "@/types/messengerTypes";
import inspectContextMenuImage from "@img/inspect-context-menu.svg";
import devtoolsShortcutWindowsImage from "@img/devtools-shortcut-windows.svg";
import devtoolsShortcutMacImage from "@img/devtools-shortcut-mac.svg";
import devtoolsDockingContextMenu from "@img/devtools-docking-context-menu.svg";
import devtoolsToolbarScreenshot from "@img/devtools-toolbar-screenshot.png";
import cx from "classnames";

let controller: AbortController;
export const WalkthroughModalApp: React.FunctionComponent = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const params = new URLSearchParams(location.search);
  const opener = JSON.parse(params.get("opener")) as Target;

  const steps = [
    <>
      <Row>
        <Modal.Title>Opening the Chrome dev tools</Modal.Title>
      </Row>
      <Row>
        The Page Editor lives in the Chrome Dev tools. So the first step is to
        open them. You can open it in two different ways.
      </Row>
      <Row>
        <Col>
          <img src={inspectContextMenuImage} alt="" />
        </Col>
        <Col>
          <img src={devtoolsShortcutMacImage} alt="" />
          <img src={devtoolsShortcutWindowsImage} alt="" />
        </Col>
      </Row>
      <Row>
        <Col>Right click anywhere on the page and select “Inspect”</Col>
        <Col>Or Utilize the keyboard shortcut for your system</Col>
      </Row>
    </>,
    <>
      <Row>
        <Modal.Title>Docking the dev tools</Modal.Title>
      </Row>
      <Row>
        Dock the dev tools to the bottom of the screen, if necessary. The Page
        Editor is a powerful tool that needs a bit of room to work it’s magic.
      </Row>
      <Row>
        <Col>
          <img src={devtoolsToolbarScreenshot} alt="" />
        </Col>
        <Col>
          <img src={devtoolsDockingContextMenu} alt="" />
        </Col>
      </Row>
      <Row>
        Click the TODO menu in the top right of the dev tools Select the TODO
        (third option) under ‘Dock side’
      </Row>
    </>,
    <>
      <Row>
        <Modal.Title>Opening the Page Editor</Modal.Title>
      </Row>
      <Row>
        Last step is to select the PixieBrix tab from the tab bar. If you don’t
        see the tab, it’s probably behind the double-chevron menu.
      </Row>
    </>,
  ];

  return (
    <Modal
      backdrop={false}
      animation={false}
      show={true}
      onHide={() => {
        closeWalkthroughModal(opener);
      }}
    >
      <Modal.Header closeButton>
        <small>
          Step {stepIndex + 1} of {steps.length}
        </small>
      </Modal.Header>
      <Carousel
        activeIndex={stepIndex}
        interval={null}
        slide={false}
        controls={false}
        indicators={false}
      >
        {steps.map((step) => {
          return (
            <Carousel.Item>
              <Modal.Body className={cx("show-grid", styles.root)}>
                <Container>{step}</Container>
              </Modal.Body>
            </Carousel.Item>
          );
        })}
      </Carousel>
      <Modal.Footer className={stepIndex > 0 ? "justify-content-between" : ""}>
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
      </Modal.Footer>
    </Modal>
  );
};

export const showWalkthroughModal = async () => {
  expectContext("contentScript");

  controller = new AbortController();

  const target = await getThisFrame();

  const frameSource = new URL(browser.runtime.getURL("walkthroughModal.html"));
  frameSource.searchParams.set("nonce", "page-editor-walkthrough");
  frameSource.searchParams.set("opener", JSON.stringify(target));
  frameSource.searchParams.set("mode", "modal");

  const modal = registerModal();
  showModal({ url: frameSource, controller });

  await modal;
  controller.abort();
};
