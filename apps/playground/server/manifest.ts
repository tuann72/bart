import type { BartServerManifest } from "@bart-ui/registry/server";

/** Server-only manifest: includes markdown bodies. */
export const serverManifest: BartServerManifest = {
  documents: [
    {
      route: "/",
      title: "Home",
      description: "Landing page for the Bart playground.",
      keywords: ["home", "playground", "bart"],
      targets: [{ id: "hero", description: "The hero headline block." }],
      body: "# Bart Playground\n\nThis is a deliberately blank demo site used to test the Bart assistant. It has three pages: Home, Pricing, and Docs.",
    },
    {
      route: "/pricing",
      title: "Pricing",
      description: "Plans and billing information.",
      keywords: ["pricing", "plans", "billing", "subscriptions", "enterprise"],
      targets: [
        { id: "pricing-comparison", description: "The plan comparison table." },
        { id: "pricing-faq", description: "Frequently asked billing questions." },
      ],
      body: "# Pricing\n\nThe playground offers three fictional plans: Free ($0), Pro ($20/month), and Enterprise (contact us). All paid plans are billed monthly and can be cancelled at any time. The plan comparison table lists every feature side by side.",
    },
    {
      route: "/docs",
      title: "Docs",
      description: "Getting-started documentation.",
      keywords: ["docs", "documentation", "quickstart", "install"],
      targets: [{ id: "quickstart", description: "The quickstart steps." }],
      body: "# Docs\n\nQuickstart: run the initializer, add your provider key to the project-root .env file (.env.local may override it), write markdown in content/bart, run bart sync, and mount the chat component.",
    },
  ],
};
