export type IconLibrary = "bootstrap" | "simple-icons";

export interface IconConfig {
  id: string;
  library?: IconLibrary;
  size?: number;
}

export interface IconOption {
  value: { id: string; library: IconLibrary };
  label: string;
}

export const iconOptions: IconOption[] = [];

function iconAsSVG(config: IconConfig): string {
  return "<svg></svg>";
}

export default iconAsSVG;
