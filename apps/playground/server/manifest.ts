import type { BartServerManifest } from "@bart-ui/registry/server";

/** Server-only manifest: includes markdown bodies. */
export const serverManifest: BartServerManifest = {
  documents: [
    {
      route: "/",
      title: "Home",
      description:
        "Stackhouse Burger Co. location, hours, and signature burgers.",
      keywords: [
        "home",
        "Stackhouse",
        "burgers",
        "location",
        "hours",
        "Chicago",
        "West Loop",
      ],
      targets: [
        { id: "home-hero", description: "The Stackhouse welcome and tagline." },
        {
          id: "signature-burgers",
          description: "The three featured signature burgers.",
        },
        {
          id: "visit-us",
          description: "The restaurant address, hours, and pickup timing.",
        },
      ],
      body: `# Stackhouse Burger Co.

Stackhouse serves crispy-edged smash burgers, hand-cut fries, and hand-spun shakes from a neighborhood counter at **42 Griddle Lane in Chicago's West Loop**, two blocks west of Morgan Station.

## Hours

- Monday–Thursday: 11am–10pm
- Friday–Saturday: 11am–midnight
- Sunday: 11am–9pm

## Signature burgers

- **The Stackhouse — $13:** Two smashed patties, sharp cheddar, griddled onions, house pickles, and Stack Sauce.
- **Smoke Show — $14:** Two smashed patties, smoked gouda, crispy onions, barbecue glaze, and pepper mayo.
- **Garden Crunch — $11:** Crispy chickpea patty, lettuce, tomato, pickles, and lemon-herb mayo. Vegetarian; remove the mayo to make it vegan.

Pickup orders are usually ready in 15–20 minutes.`,
    },
    {
      route: "/pricing",
      title: "Pricing",
      description: "Burger menu, sides, shakes, and combo pricing.",
      keywords: [
        "pricing",
        "menu",
        "price",
        "cost",
        "burger",
        "combo",
        "fries",
        "shake",
      ],
      targets: [
        { id: "burger-menu", description: "Burger descriptions and prices." },
        {
          id: "combo-deals",
          description: "Combo upgrade, sides, shakes, and kids pricing.",
        },
      ],
      body: `# Menu and pricing

Every Stackhouse burger is smashed to order and served on a toasted potato roll.

| Burger | Price | What's on it |
| --- | ---: | --- |
| The Stackhouse | $13 | Two patties, sharp cheddar, griddled onions, house pickles, Stack Sauce |
| Smoke Show | $14 | Two patties, smoked gouda, crispy onions, barbecue glaze, pepper mayo |
| Garden Crunch | $11 | Crispy chickpea patty, lettuce, tomato, pickles, lemon-herb mayo |

## Combos, sides, and shakes

- Add hand-cut fries and a fountain drink to any burger for **$5**. Fountain drinks include free refills while dining in.
- Swap the combo fries for onion rings for **$2 more**.
- Hand-cut fries: **$4**
- Onion rings: **$5**
- Hand-spun shake: **$6**
- Kids combo: **$8**`,
    },
    {
      route: "/faq",
      title: "FAQ",
      description: "Ordering, location, reservations, and dietary answers.",
      keywords: [
        "FAQ",
        "questions",
        "pickup",
        "delivery",
        "reservations",
        "vegetarian",
        "vegan",
        "gluten",
        "allergies",
      ],
      targets: [
        {
          id: "ordering-faq",
          description: "Pickup, delivery, reservation, and location answers.",
        },
        {
          id: "dietary-faq",
          description: "Vegetarian, vegan, gluten, allergy, and fryer notes.",
        },
      ],
      body: `# Frequently asked questions

## Orders and visits

**Can I order ahead?** Yes. Pickup orders are usually ready in 15–20 minutes. Delivery is available within five miles of the restaurant.

**Do you take reservations?** Stackhouse is walk-in only. Parties of eight or more can call ahead, and the team will do its best to seat everyone together.

**Where are you located?** 42 Griddle Lane in Chicago's West Loop, two blocks west of Morgan Station.

## Dietary notes

- **Vegetarian and vegan:** The Garden Crunch is vegetarian and can be made vegan without lemon-herb mayo.
- **Gluten-aware:** Any burger can be served in a lettuce wrap, but the shared kitchen is not certified gluten-free.
- **Allergies:** Guests should tell the cashier before ordering. Dairy, egg, wheat, soy, and sesame are handled in the kitchen.
- **Cooking oil:** Fries and onion rings are cooked in refined peanut oil in a shared fryer.`,
    },
  ],
};
