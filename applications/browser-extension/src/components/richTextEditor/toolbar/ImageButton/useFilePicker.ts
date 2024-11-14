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

import { useState } from "react";

interface UseFilePickerOptions {
  accept: string;
}

function useFilePicker({ accept }: UseFilePickerOptions) {
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);

  const pickFile = async (): Promise<File> => {
    if (isFilePickerOpen) {
      throw new Error("File picker is already open");
    }

    return new Promise((resolve, reject) => {
      setIsFilePickerOpen(true);
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;

      const handleFileSelection = (event: Event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        setIsFilePickerOpen(false);

        if (!file) {
          reject(new Error("No file selected"));
          return;
        }

        resolve(file);
      };

      const handleCancel = () => {
        setIsFilePickerOpen(false);
        reject(new Error("File selection cancelled"));
      };

      input.addEventListener("change", handleFileSelection);
      input.addEventListener("cancel", handleCancel);

      input.click();
      input.remove();
    });
  };

  return { pickFile, isFilePickerOpen };
}

export default useFilePicker;
