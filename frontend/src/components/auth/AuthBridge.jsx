import { useEffect } from "react";
import { useAuth } from "@clerk/react";
import { toast } from "sonner";
import { api, clientId } from "@/lib/api";

// After sign-in: move this browser's runs into the account.
export const AuthBridge = () => {
  const { isSignedIn, userId } = useAuth();
  useEffect(() => {
    if (!isSignedIn) return;
    api.post("/me/claim", { client_id: clientId() }).then(({ data: c }) => {
      if (c.claimed > 0) toast.success(`${c.claimed} earlier run${c.claimed > 1 ? "s" : ""} from this browser added to your account`);
    }).catch(() => {});
  }, [isSignedIn, userId]);
  return null;
};
