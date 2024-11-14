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

import {useState} from "react";

interface UseFilePickerOptions {
  accept: string;
  onFileSelect: (file: File) => Promise<void>;
}

function useFilePicker({ accept, onFileSelect }: UseFilePickerOptions) {
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);

  const pickFile = async () => {
    setIsFilePickerOpen(true);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;

    const handleFileSelection = async (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        setIsFilePickerOpen(false);
        return;
      }

      await onFileSelect(file);
      setIsFilePickerOpen(false);
    };

    input.addEventListener("change", handleFileSelection);
    input.addEventListener("cancel", () => {
      setIsFilePickerOpen(false);
    });

    input.click();
    input.remove();
  };

  return { pickFile, isFilePickerOpen };
}

export default useFilePicker;
