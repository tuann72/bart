import { useEffect, useState } from "react";
import { BartChat, dismissHighlight, type BartVariant } from "@bart-ui/registry";
import { publicManifest } from "./manifest";

const VARIANTS: BartVariant[] = ["dock", "sidebar", "spotlight"];

function PageContent({ route }: { route: string }) {
  if (route === "/pricing") {
    return (
      <div className="space-y-10">
        <h2 className="text-2xl font-semibold">Pricing</h2>
        <div
          data-bart-target="pricing-comparison"
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-6"
        >
          <h3 className="mb-4 font-medium">Plan comparison</h3>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="py-2">Feature</th>
                <th>Free</th>
                <th>Pro</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody className="text-zinc-500 dark:text-zinc-400">
              <tr>
                <td className="py-2">Price</td>
                <td>$0</td>
                <td>$20/mo</td>
                <td>Contact us</td>
              </tr>
              <tr>
                <td className="py-2">Projects</td>
                <td>1</td>
                <td>10</td>
                <td>Unlimited</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          data-bart-target="pricing-faq"
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-6"
        >
          <h3 className="mb-2 font-medium">Billing FAQ</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Paid plans are billed monthly and can be cancelled at any time.
          </p>
        </div>
      </div>
    );
  }

  if (route === "/docs") {
    return (
      <div className="space-y-10">
        <h2 className="text-2xl font-semibold">Docs</h2>
        <div
          data-bart-target="quickstart"
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-6"
        >
          <h3 className="mb-2 font-medium">Quickstart</h3>
          <ol className="list-decimal pl-5 text-sm text-zinc-500 dark:text-zinc-400 space-y-1">
            <li>Run the initializer</li>
            <li>
              Add your provider key to the project-root .env file (.env.local
              may override it)
            </li>
            <li>Write markdown and run bart sync</li>
            <li>Mount the chat component</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div
      data-bart-target="hero"
      className="mx-auto max-w-md text-center space-y-3 py-16"
    >
      <h2 className="text-3xl font-semibold tracking-tight">
        A blank page, on purpose.
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        This canvas exists to test Bart visually. Open the assistant and try
        “what do the plans cost?”, “highlight the pricing table”, or “take me
        to the docs”.
      </p>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState("/");
  const [variant, setVariant] = useState<BartVariant>("dock");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const navigate = (next: string) => {
    dismissHighlight();
    setRoute(next);
  };

  return (
    <div className="relative min-h-dvh bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 font-sans antialiased">
      {/* Decorative color for the spotlight's glass blur to pick up. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-400/40 dark:bg-blue-500/25 blur-3xl" />
        <div className="absolute top-1/4 right-[-6rem] h-80 w-80 rounded-full bg-teal-300/40 dark:bg-teal-400/20 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-1/3 h-80 w-80 rounded-full bg-fuchsia-300/30 dark:bg-fuchsia-500/15 blur-3xl" />
      </div>
      <header className="relative z-10 flex flex-wrap items-center gap-4 border-b border-zinc-200 dark:border-zinc-700 px-6 py-3 text-sm">
        <strong className="tracking-tight">Bart Playground</strong>
        <nav className="flex gap-1" aria-label="Fake site navigation">
          {publicManifest.routes.map((r) => (
            <button
              key={r.route}
              type="button"
              onClick={() => navigate(r.route)}
              className={`rounded-md px-2.5 py-1 ${
                route === r.route
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:text-inherit"
              }`}
            >
              {r.title}
            </button>
          ))}
        </nav>
        <div
          className="ms-auto flex items-center gap-1"
          role="radiogroup"
          aria-label="Bart variant"
        >
          {VARIANTS.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={variant === v}
              onClick={() => setVariant(v)}
              className={`rounded-md px-2.5 py-1 capitalize ${
                variant === v
                  ? "bg-bart-primary text-bart-primary-foreground"
                  : "text-zinc-500 hover:text-inherit"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setDark((d) => !d)}
          className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2.5 py-1"
          aria-pressed={dark}
        >
          {dark ? "Light" : "Dark"}
        </button>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-14">
        <p className="mb-8 text-xs uppercase tracking-widest text-zinc-400">
          current route: {route}
        </p>
        <PageContent route={route} />
      </main>

      <BartChat
        key={variant}
        variant={variant}
        api="/api/bart"
        currentRoute={route}
        navigate={navigate}
        manifest={publicManifest}
      />
    </div>
  );
}
