/** The fictional Stackhouse Burger Co. pages: pure site content, no
 *  playground chrome. Each data-bart-target here is registered in the
 *  manifests. */
const burgers = [
  {
    name: "The Stackhouse",
    price: "$13",
    description:
      "Two smashed patties, sharp cheddar, griddled onions, house pickles, and Stack Sauce.",
    badge: "House favorite",
  },
  {
    name: "Smoke Show",
    price: "$14",
    description:
      "Two smashed patties, smoked gouda, crispy onions, barbecue glaze, and pepper mayo.",
    badge: "Big flavor",
  },
  {
    name: "Garden Crunch",
    price: "$11",
    description:
      "Crispy chickpea patty, lettuce, tomato, pickles, and lemon-herb mayo.",
    badge: "Vegetarian",
  },
] as const;

const faqs = [
  {
    question: "Can I order ahead?",
    answer:
      "Yes. Pickup orders are usually ready in 15–20 minutes. Delivery is available within five miles of the restaurant.",
  },
  {
    question: "Do you take reservations?",
    answer:
      "We are walk-in only. Parties of eight or more can call ahead and we will do our best to seat everyone together.",
  },
  {
    question: "Where are you located?",
    answer:
      "Find us at 42 Griddle Lane in Chicago's West Loop, two blocks west of Morgan Station.",
  },
] as const;

export function PageContent({
  route,
  navigate,
}: {
  route: string;
  navigate: (route: string) => void;
}) {
  if (route === "/pricing") {
    return (
      <div className="space-y-12">
        <section className="max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-700 dark:text-orange-400">
            Menu & pricing
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            Built hot. Priced straight.
          </h1>
          <p className="text-zinc-600 dark:text-zinc-300">
            Every burger is smashed to order and served on a toasted potato
            roll. No mystery fees and no tiny type.
          </p>
        </section>

        <section data-bart-target="burger-menu" className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Burgers
              </p>
              <h2 className="text-2xl font-bold">Choose your stack</h2>
            </div>
            <span className="text-xs text-zinc-500">Fries sold separately</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {burgers.map((burger, index) => (
              <article
                key={burger.name}
                className="flex min-h-64 flex-col rounded-3xl border border-orange-200/80 bg-white/80 p-5 shadow-sm dark:border-orange-950 dark:bg-zinc-900/75"
              >
                <div
                  className={`mb-5 flex h-20 items-center justify-center rounded-2xl text-3xl font-black ${
                    index === 0
                      ? "bg-orange-200 text-orange-950 dark:bg-orange-900 dark:text-orange-100"
                      : index === 1
                        ? "bg-red-200 text-red-950 dark:bg-red-950 dark:text-red-100"
                        : "bg-lime-200 text-lime-950 dark:bg-lime-950 dark:text-lime-100"
                  }`}
                  aria-hidden="true"
                >
                  {index + 1}
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-orange-700 dark:text-orange-400">
                  {burger.badge}
                </span>
                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <h3 className="font-bold">{burger.name}</h3>
                  <strong>{burger.price}</strong>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {burger.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          data-bart-target="combo-deals"
          className="grid gap-5 rounded-3xl bg-zinc-950 p-7 text-white sm:grid-cols-[1.2fr_0.8fr] dark:bg-orange-950"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
              Make it a combo
            </p>
            <h2 className="mt-2 text-2xl font-bold">Add fries and a drink for $5</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-300">
              Swap onion rings for $2 more. Fountain drinks include free
              refills while dining in.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/10 p-4">
              <span className="block text-zinc-300">Hand-cut fries</span>
              <strong className="mt-1 block text-xl">$4</strong>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <span className="block text-zinc-300">Onion rings</span>
              <strong className="mt-1 block text-xl">$5</strong>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <span className="block text-zinc-300">Hand-spun shake</span>
              <strong className="mt-1 block text-xl">$6</strong>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <span className="block text-zinc-300">Kids combo</span>
              <strong className="mt-1 block text-xl">$8</strong>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (route === "/faq") {
    return (
      <div className="space-y-12">
        <section className="max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-700 dark:text-orange-400">
            Good questions
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            Everything but the secret sauce.
          </h1>
          <p className="text-zinc-600 dark:text-zinc-300">
            The quick answers on ordering, visiting, ingredients, and dietary
            needs.
          </p>
        </section>

        <section data-bart-target="ordering-faq" className="space-y-4">
          <h2 className="text-2xl font-bold">Orders & visits</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {faqs.map((faq) => (
              <article
                key={faq.question}
                className="rounded-2xl border border-orange-200/80 bg-white/80 p-5 dark:border-orange-950 dark:bg-zinc-900/75"
              >
                <h3 className="font-bold">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {faq.answer}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          data-bart-target="dietary-faq"
          className="rounded-3xl border border-lime-300 bg-lime-50 p-7 dark:border-lime-900 dark:bg-lime-950/40"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-800 dark:text-lime-400">
            Dietary notes
          </p>
          <h2 className="mt-2 text-2xl font-bold">Options for every appetite</h2>
          <div className="mt-5 grid gap-5 text-sm leading-6 text-zinc-700 sm:grid-cols-2 dark:text-zinc-300">
            <p>
              <strong className="block text-zinc-950 dark:text-white">Vegetarian</strong>
              The Garden Crunch is vegetarian and can be made vegan without
              lemon-herb mayo.
            </p>
            <p>
              <strong className="block text-zinc-950 dark:text-white">Gluten-aware</strong>
              Any burger can be served in a lettuce wrap. Our shared kitchen is
              not certified gluten-free.
            </p>
            <p>
              <strong className="block text-zinc-950 dark:text-white">Allergies</strong>
              Tell the cashier before ordering. Dairy, egg, wheat, soy, and
              sesame are handled in our kitchen.
            </p>
            <p>
              <strong className="block text-zinc-950 dark:text-white">Cooking oil</strong>
              Fries and onion rings are cooked in refined peanut oil in a
              shared fryer.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      <section
        data-bart-target="home-hero"
        className="grid items-center gap-8 py-8 sm:grid-cols-[1.15fr_0.85fr] sm:py-14"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-700 dark:text-orange-400">
            Smashed fresh in Chicago
          </p>
          <h1 className="mt-3 text-5xl font-black leading-[0.95] tracking-[-0.05em] sm:text-7xl">
            Big flavor.
            <span className="block text-orange-600">Zero pretense.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
            Stackhouse serves crispy-edged smash burgers, hand-cut fries, and
            hand-spun shakes from a neighborhood counter in the West Loop.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/pricing")}
              className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700"
            >
              See the menu
            </button>
            <button
              type="button"
              onClick={() => navigate("/faq")}
              className="rounded-full border border-zinc-300 bg-white/60 px-5 py-2.5 text-sm font-bold hover:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900/60"
            >
              Read the FAQ
            </button>
          </div>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-sm rounded-[2.5rem] bg-orange-500 p-6 shadow-2xl shadow-orange-900/20 rotate-2">
          <div className="flex h-full flex-col items-center justify-center rounded-[2rem] border-2 border-orange-200/70 bg-orange-950 text-center text-orange-50">
            <span className="text-7xl font-black tracking-[-0.08em]">SH</span>
            <span className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-orange-300">
              Made to stack
            </span>
          </div>
        </div>
      </section>

      <section data-bart-target="signature-burgers" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Crowd favorites
            </p>
            <h2 className="text-3xl font-black tracking-tight">Meet the stacks</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate("/pricing")}
            className="text-sm font-bold text-orange-700 underline decoration-orange-300 underline-offset-4 dark:text-orange-400"
          >
            Full menu and prices
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {burgers.map((burger) => (
            <article
              key={burger.name}
              className="rounded-2xl border border-orange-200/80 bg-white/70 p-5 dark:border-orange-950 dark:bg-zinc-900/70"
            >
              <span className="text-xs font-semibold uppercase tracking-widest text-orange-700 dark:text-orange-400">
                {burger.badge}
              </span>
              <h3 className="mt-2 text-lg font-bold">{burger.name}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {burger.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        data-bart-target="visit-us"
        className="grid gap-6 rounded-3xl bg-orange-100 p-7 sm:grid-cols-2 dark:bg-orange-950/45"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-800 dark:text-orange-300">
            Find us
          </p>
          <h2 className="mt-2 text-2xl font-black">42 Griddle Lane</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Chicago, IL · West Loop · Two blocks west of Morgan Station
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong className="block">Mon–Thu</strong>
            <span className="text-zinc-600 dark:text-zinc-400">11am–10pm</span>
          </div>
          <div>
            <strong className="block">Fri–Sat</strong>
            <span className="text-zinc-600 dark:text-zinc-400">11am–midnight</span>
          </div>
          <div>
            <strong className="block">Sunday</strong>
            <span className="text-zinc-600 dark:text-zinc-400">11am–9pm</span>
          </div>
          <div>
            <strong className="block">Pickup</strong>
            <span className="text-zinc-600 dark:text-zinc-400">15–20 minutes</span>
          </div>
        </div>
      </section>
    </div>
  );
}
