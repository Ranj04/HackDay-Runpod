import { BattleArena } from "./battle-arena";

export default function BattlePage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 lg:py-14">
      <div className="mb-8 max-w-3xl">
        <p className="eyebrow">Form battle</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          Same scorer. Higher form wins.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          A skill-based basketball form challenge using demo testnet tokens
          only. This is not real-money gambling and has no cash value.
        </p>
      </div>
      <BattleArena />
    </main>
  );
}
