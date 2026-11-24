import axios from "axios";
import useSWR from "swr";

export const api = axios.create({ baseURL: `${process.env.REACT_APP_BACKEND_URL}/api` });

// Attach the Clerk session token when signed in; signed-out requests go without it.
api.interceptors.request.use(async (config) => {
  const token = await window.Clerk?.session?.getToken?.().catch(() => null);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const clientId = () => {
  let id = localStorage.getItem("ar_client_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("ar_client_id", id);
  }
  return id;
};

export const money = (n) => `$${Number(n || 0).toFixed(2)}`;

export const fmtDate = (iso) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const useConfig = () =>
  useSWR("/config", (u) => api.get(u).then((r) => r.data), { revalidateOnFocus: false }).data;

export const unitLabel = (n, unit) => `${n.toLocaleString()} ${unit}`;

export const isResearcher = (mode) => mode === "researcher" || mode === "creator";
export const modeLabel = (run, long = false) =>
  isResearcher(run.mode) ? `Researcher · ${run.role || "Other"}` : long ? "Launching a product" : "Launch";
