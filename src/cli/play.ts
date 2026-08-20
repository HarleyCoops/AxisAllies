import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { POWERS } from "../data/catalog.ts";
import { spectatorBundle } from "../harness/artifacts.ts";
import { LlmPolicy, RandomLegalPolicy } from "../harness/policies.ts";
import { runGame } from "../harness/runner.ts";

function arg(flag: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function has(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main(): Promise<void> {
  const seed = Number(arg("--seed", "1942"));
  const rounds = Number(arg("--rounds", "6"));
  const useLlm = has("--llm");
  const outDir = resolve(arg("--out", `runs/run-${seed}`) ?? `runs/run-${seed}`);

  const policies = Object.fromEntries(
    POWERS.map((p, idx) => [
      p,
      useLlm ? new LlmPolicy({ fallbackSeed: seed + (idx + 1) * 17 }) : new RandomLegalPolicy(seed + (idx + 1) * 17),
    ]),
  );

  console.log(`AxisAllies gym — seed=${seed} maxTurns=${rounds} out=${outDir}`);
  console.log(useLlm ? "Policies: LlmPolicy (dry-run unless AXISALLIES_API_KEY is set)" : "Policies: RandomLegalPolicy × 5");

  const result = await runGame({
    seed,
    maxTurns: rounds,
    outDir,
    policies,
    onStep: ({ i, state }) => {
      if (i % 50 === 0) {
        process.stdout.write(`  step ${i} turn ${state.turn} ${state.activePower} ${state.phase}\n`);
      }
    },
  });

  const bundle = spectatorBundle(result.frames, result.trajectory);
  writeFileSync(resolve(outDir, "spectator.json"), JSON.stringify(bundle));
  mkdirSync("public", { recursive: true });
  writeFileSync("public/latest-run.json", JSON.stringify(bundle));

  console.log(`Done. steps=${result.steps} winner=${result.winner ?? "none"} turn=${result.state.turn}`);
  console.log(`Artifacts: ${outDir}`);
  console.log("Open the spectator: npm run dev");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
