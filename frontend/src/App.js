import "@/App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/Layout";
import { FlowProvider } from "@/lib/flow";
import Landing from "@/pages/Landing";
import Roadmap from "@/pages/Roadmap";
import Describe from "@/pages/Describe";
import AudiencePage from "@/pages/Audience";
import Sources from "@/pages/Sources";
import Pay from "@/pages/Pay";
import Results from "@/pages/Results";
import Kit from "@/pages/Kit";
import History from "@/pages/History";
import SharedRun from "@/pages/SharedRun";
import { SignInPage, SignUpPage } from "@/pages/AuthPages";
import ClerkAuthProvider from "@/components/auth/ClerkAuthProvider";
import { AuthBridge } from "@/components/auth/AuthBridge";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <FlowProvider>
        <div className="App">
          <BrowserRouter>
            <ClerkAuthProvider>
            <AuthBridge />
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/roadmap" element={<Roadmap />} />
                <Route path="/sign-in/*" element={<SignInPage />} />
                <Route path="/sign-up/*" element={<SignUpPage />} />
                <Route path="/s/:token" element={<SharedRun />} />
                <Route path="/app" element={<Describe />} />
                <Route path="/app/audience" element={<AudiencePage />} />
                <Route path="/app/sources" element={<Sources />} />
                <Route path="/app/pay/:runId" element={<Pay />} />
                <Route path="/app/runs/:runId" element={<Results />} />
                <Route path="/app/runs/:runId/kit" element={<Kit />} />
                <Route path="/history" element={<History />} />
              </Route>
            </Routes>
            </ClerkAuthProvider>
          </BrowserRouter>
          <Toaster position="bottom-center" />
        </div>
      </FlowProvider>
    </ThemeProvider>
  );
}

export default App;
