import type {
  BartAppearance,
  BartVariant,
  SidebarLauncher,
} from "@bart-ui/registry";
import { publicManifest } from "./manifest";

export type PlaygroundSide = "left" | "right";

const VARIANTS: BartVariant[] = ["dock", "sidebar", "spotlight"];
const APPEARANCES: BartAppearance[] = ["default", "glass"];
const LAUNCHERS: SidebarLauncher[] = ["tab", "button"];
const SIDES: PlaygroundSide[] = ["left", "right"];

function RadioGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  className = "",
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((item) => (
        <button
          key={item}
          type="button"
          role="radio"
          aria-checked={value === item}
          onClick={() => onChange(item)}
          className={`rounded-md px-2.5 py-1 capitalize ${
            value === item
              ? "bg-bart-primary text-bart-primary-foreground"
              : "text-zinc-500 hover:text-inherit"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

/** The playground's own chrome: brand, site nav, and the Bart knobs. */
export function PlaygroundHeader({
  route,
  onNavigate,
  variant,
  onVariantChange,
  appearance,
  onAppearanceChange,
  side,
  onSideChange,
  launcher,
  onLauncherChange,
  dark,
  onDarkToggle,
}: {
  route: string;
  onNavigate: (route: string) => void;
  variant: BartVariant;
  onVariantChange: (variant: BartVariant) => void;
  appearance: BartAppearance;
  onAppearanceChange: (appearance: BartAppearance) => void;
  side: PlaygroundSide;
  onSideChange: (side: PlaygroundSide) => void;
  launcher: SidebarLauncher;
  onLauncherChange: (launcher: SidebarLauncher) => void;
  dark: boolean;
  onDarkToggle: () => void;
}) {
  return (
    <header className="relative z-10 flex flex-wrap items-center gap-4 border-b border-orange-200/80 bg-[#fffaf3]/75 px-6 py-3 text-sm backdrop-blur dark:border-orange-950 dark:bg-[#18110d]/75">
      <strong className="flex items-center gap-2 tracking-tight">
        <span className="flex size-7 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white">
          B
        </span>
        Bart Playground
      </strong>
      <nav className="flex gap-1" aria-label="Stackhouse navigation">
        {publicManifest.routes.map((item) => (
          <button
            key={item.route}
            type="button"
            onClick={() => onNavigate(item.route)}
            className={`rounded-full px-3 py-1.5 font-medium ${
              route === item.route
                ? "bg-zinc-950 text-white dark:bg-orange-500 dark:text-orange-950"
                : "text-zinc-500 hover:text-inherit"
            }`}
          >
            {item.title}
          </button>
        ))}
      </nav>
      <RadioGroup
        label="Bart variant"
        options={VARIANTS}
        value={variant}
        onChange={onVariantChange}
        className="ms-auto"
      />
      <RadioGroup
        label="Bart appearance"
        options={APPEARANCES}
        value={appearance}
        onChange={onAppearanceChange}
      />
      {variant !== "spotlight" && (
        <RadioGroup
          label="Bart side"
          options={SIDES}
          value={side}
          onChange={onSideChange}
        />
      )}
      {variant === "sidebar" && (
        <RadioGroup
          label="Sidebar launcher"
          options={LAUNCHERS}
          value={launcher}
          onChange={onLauncherChange}
        />
      )}
      <button
        type="button"
        onClick={onDarkToggle}
        className="rounded-full border border-orange-200 bg-white/60 px-3 py-1 dark:border-orange-900 dark:bg-zinc-900/60"
        aria-pressed={dark}
      >
        {dark ? "Light" : "Dark"}
      </button>
    </header>
  );
}
