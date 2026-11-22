import { SignIn, SignUp } from "@clerk/react";
import { Mail } from "lucide-react";

const EmailNote = () => (
  <div className="flex max-w-[400px] items-start gap-3 rounded-2xl border border-line p-4 text-sm" data-testid="email-code-note">
    <Mail size={18} className="mt-0.5 shrink-0 text-btn" />
    <p>Use any email address. We email you a one-time code, no password needed.</p>
  </div>
);

const Shell = ({ title, children, testid }) => (
  <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-5 py-12" data-testid={testid}>
    <h1 className="text-center font-display text-3xl font-bold sm:text-4xl">{title}</h1>
    <EmailNote />
    {children}
    <p className="max-w-[400px] text-center text-xs text-soft">Signing up is optional. Runs keep working without an account.</p>
  </div>
);

export const SignInPage = () => (
  <Shell title="Welcome back" testid="sign-in-page">
    <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp />
  </Shell>
);

export const SignUpPage = () => (
  <Shell title="Keep your runs on any device" testid="sign-up-page">
    <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
  </Shell>
);
