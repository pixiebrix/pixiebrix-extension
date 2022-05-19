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
import React, {
  useCallback,
  useState,
  useEffect,
  useContext,
  createContext,
} from "react";
import { Modal, Button } from "react-bootstrap";
import { ButtonVariant } from "react-bootstrap/types";

type ModalProps = {
  title?: string;
  message: string;
  submitVariant?: ButtonVariant;
  submitCaption?: string;
  cancelCaption?: string;
};

type ModalContextProps = {
  showConfirmation: (modalProps: ModalProps) => Promise<boolean>;
};

const initialModalState: ModalContextProps = {
  showConfirmation() {
    throw new Error("showConfirmation not configured");
  },
};

export const ModalContext = createContext<ModalContextProps>(initialModalState);

const ConfirmationModal: React.FunctionComponent<
  ModalProps & {
    onCancel: () => void;
    onSubmit: () => void;
    onExited: () => void;
    isVisible: boolean;
  }
> = ({
  title,
  message,
  submitCaption,
  submitVariant = "danger",
  cancelCaption,
  isVisible,
  onExited,
  onCancel,
  onSubmit,
}) => (
  <Modal
    show={isVisible}
    onExited={onExited}
    onHide={onCancel}
    backdrop="static"
    keyboard={false}
  >
    <Modal.Header closeButton>
      <Modal.Title>{title ?? "Confirm?"}</Modal.Title>
    </Modal.Header>
    <Modal.Body>{message}</Modal.Body>
    <Modal.Footer>
      <Button variant="info" onClick={onCancel}>
        {cancelCaption ?? "Cancel"}
      </Button>
      <Button variant={submitVariant} onClick={onSubmit}>
        {submitCaption ?? "Continue"}
      </Button>
    </Modal.Footer>
  </Modal>
);

type Callback = (submit: boolean) => void;

export const ModalProvider: React.FunctionComponent<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [modalProps, setModalProps] = useState<ModalProps | null>();
  const [callback, setCallback] = useState<Callback | null>();
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  useEffect(
    // On unmount, resolve the promise as if the user cancelled out of the modal
    () => () => {
      if (callback) {
        callback(false);
      }
    },
    [callback]
  );

  const showConfirmation = useCallback(
    async (modalProps: ModalProps) => {
      if (callback) {
        // Cancel any previous modal that was showing
        callback(false);
      }

      return new Promise<boolean>((resolve) => {
        setModalProps(modalProps);
        setIsModalVisible(true);
        const newCallback = (submit: boolean) => {
          resolve(submit);
          setCallback(null);
        };

        setCallback((_prevState: Callback) => newCallback);
      });
    },
    [callback, setModalProps]
  );

  return (
    <ModalContext.Provider value={{ showConfirmation }}>
      {
        <ConfirmationModal
          {...modalProps}
          onSubmit={() => {
            setIsModalVisible(false);
            callback(true);
          }}
          onCancel={() => {
            setIsModalVisible(false);
            callback(false);
          }}
          isVisible={isModalVisible}
          onExited={() => {
            setModalProps(null);
          }}
        />
      }
      {children}
    </ModalContext.Provider>
  );
};

export function useModals(): ModalContextProps {
  return useContext(ModalContext);
}
