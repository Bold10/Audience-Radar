import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { toast } from "sonner";
import { api, clientId } from "@/lib/api";

// After sign-in: enforce the Gmail-only rule and move this browser's runs into the account.
export const AuthBridge = () => {
  const { isSignedIn, userId, signOut } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      const { data } = await api.get("/me");
      if (!data.gmail) {
        toast.error(data.message, { duration: 7000 });
        await signOut();
        nav("/sign-up?gmail=required", { replace: true });
        return;
      }
      const { data: c } = await api.post("/me/claim", { client_id: clientId() });
      if (c.claimed > 0) toast.success(`${c.claimed} earlier run${c.claimed > 1 ? "s" : ""} from this browser added to your account`);
    })().catch(() => {});
  }, [isSignedIn, userId]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};
