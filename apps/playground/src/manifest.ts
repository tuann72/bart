import type { BartPublicManifest } from "@bart-ui/registry";

/** In a real project `bart sync` generates this from content/bart/*.md. */
export const publicManifest: BartPublicManifest = {
  routes: [
    {
      route: "/",
      title: "Home",
      description: "Landing page for the Bart playground.",
      targets: [{ id: "hero", description: "The hero headline block." }],
    },
    {
      route: "/pricing",
      title: "Pricing",
      description: "Plans and billing information.",
      targets: [
        { id: "pricing-comparison", description: "The plan comparison table." },
        { id: "pricing-faq", description: "Frequently asked billing questions." },
      ],
    },
    {
      route: "/docs",
      title: "Docs",
      description: "Getting-started documentation.",
      targets: [{ id: "quickstart", description: "The quickstart steps." }],
    },
  ],
};
