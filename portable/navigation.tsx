import { createContext, useContext } from "react";
export const PathContext = createContext("/");
export function usePathname() {
  return useContext(PathContext).split("?")[0];
}
