import { createContext, createElement, useContext, useEffect, useState } from "react";

const FlowCtx = createContext(null);
const KEY = "ar_flow";
export const INITIAL_FLOW = {
  description: "",
  mode: "launch",
  role: "Video creator",
  roleOther: "",
  xPosts: 50,
  audience: null,
  options: [],
  optionsSource: null,
  seen: [],
  round: 0,
  sources: ["x", "telegram", "reddit", "youtube"],
};

export function FlowProvider({ children }) {
  const [flow, setFlow] = useState(() => {
    try {
      const saved = { ...INITIAL_FLOW, ...JSON.parse(sessionStorage.getItem(KEY) || "{}") };
      return saved.mode === "creator" ? { ...saved, mode: "researcher" } : saved;
    } catch {
      return INITIAL_FLOW;
    }
  });
  useEffect(() => sessionStorage.setItem(KEY, JSON.stringify(flow)), [flow]);
  const update = (patch) => setFlow((f) => ({ ...f, ...patch }));
  return createElement(FlowCtx.Provider, { value: { flow, update } }, children);
}

export const useFlow = () => useContext(FlowCtx);
