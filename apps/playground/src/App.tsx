import { useEffect, useState } from "react";
import {
  BartChat,
  dismissHighlight,
  type BartAppearance,
  type BartVariant,
  type SidebarLauncher,
} from "@bart-ui/registry";
import { publicManifest } from "./manifest";
import { PageContent } from "./pages";
import { PlaygroundHeader, type PlaygroundSide } from "./playground-controls";

export default function App() {
  const [route, setRoute] = useState("/");
  const [variant, setVariant] = useState<BartVariant>("dock");
  const [appearance, setAppearance] = useState<BartAppearance>("default");
  const [launcher, setLauncher] = useState<SidebarLauncher>("tab");
  const [side, setSide] = useState<PlaygroundSide>("right");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const navigate = (next: string) => {
    dismissHighlight();
    setRoute(next);
  };

  return (
    <div className="relative min-h-dvh overflow-hidden text-zinc-950 dark:text-zinc-50 font-sans antialiased">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -left-32 h-[30rem] w-[30rem] rounded-full bg-orange-300/45 blur-3xl dark:bg-orange-800/20" />
        <div className="absolute top-1/3 right-[-10rem] h-96 w-96 rounded-full bg-lime-200/50 blur-3xl dark:bg-lime-800/10" />
        <div className="absolute bottom-[-8rem] left-1/3 h-96 w-96 rounded-full bg-red-200/35 blur-3xl dark:bg-red-900/15" />
      </div>

      <PlaygroundHeader
        route={route}
        onNavigate={navigate}
        variant={variant}
        onVariantChange={setVariant}
        appearance={appearance}
        onAppearanceChange={setAppearance}
        side={side}
        onSideChange={setSide}
        launcher={launcher}
        onLauncherChange={setLauncher}
        dark={dark}
        onDarkToggle={() => setDark((value) => !value)}
      />

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-10 sm:py-14">
        <PageContent route={route} navigate={navigate} />
      </main>

      {/* key={variant} remounts on variant switch, resetting the conversation
          — intentional for the playground. */}
      <BartChat
        key={variant}
        variant={variant}
        appearance={appearance}
        side={side}
        launcher={launcher}
        title="Bart"
        api="/api/bart"
        currentRoute={route}
        navigate={navigate}
        manifest={publicManifest}
      />
    </div>
  );
}
