import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const trackerPath = resolve(root, "docs/production-distribution-progress.md");
const tracker = readFileSync(trackerPath, "utf8");
const phasePattern = /^## Etapa (\d+) — (.+)$/gm;
const taskPattern = /^- \[([ xX])\] \*\*\[([A-Z]\d-\d+)\]\*\* (.+)$/;
const headings = [...tracker.matchAll(phasePattern)];

if (headings.length === 0) {
  throw new Error(`No se encontraron etapas en ${trackerPath}`);
}

const phases = headings.map((heading, index) => {
  const start = heading.index + heading[0].length;
  const end = headings[index + 1]?.index ?? tracker.length;
  const lines = tracker.slice(start, end).split(/\r?\n/);
  const tasks = lines.flatMap((line) => {
    const match = line.match(taskPattern);
    if (!match && /^- \[[ xX]\]/.test(line)) {
      throw new Error(`Hito con formato no reconocido en la etapa ${heading[1]}: ${line}`);
    }
    if (!match) return [];
    return [{
      done: match[1].toLowerCase() === "x",
      id: match[2],
      description: match[3],
    }];
  });

  if (tasks.length === 0) {
    throw new Error(`La etapa ${heading[1]} no tiene hitos contables.`);
  }

  return {
    number: Number(heading[1]),
    name: heading[2],
    tasks,
    done: tasks.filter((task) => task.done).length,
  };
});

const allTasks = phases.flatMap((phase) => phase.tasks);
const totalDone = allTasks.filter((task) => task.done).length;
const currentPhase = phases.find((phase) => phase.done < phase.tasks.length);
const percentage = (done, total) => Math.round((done / total) * 100);
const bar = (value, width = 24) => {
  const filled = Math.round((value / 100) * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    currentStage: currentPhase ? { number: currentPhase.number, name: currentPhase.name } : null,
    overall: { done: totalDone, total: allTasks.length, percent: percentage(totalDone, allTasks.length) },
    phases: phases.map((phase) => ({
      number: phase.number,
      name: phase.name,
      done: phase.done,
      total: phase.tasks.length,
      percent: percentage(phase.done, phase.tasks.length),
      open: phase.tasks.filter((task) => !task.done),
    })),
  }, null, 2));
  process.exit(0);
}

console.log("ORI CRUIT HUB · avance hacia producción y distribución");
console.log(`Calculado (UTC): ${new Date().toISOString()}`);
console.log(`Hitos cerrados: ${totalDone}/${allTasks.length} (${percentage(totalDone, allTasks.length)}%)`);
console.log("El porcentaje cuenta hitos marcados con evidencia; no representa esfuerzo ni calendario.\n");

for (const phase of phases) {
  const percent = percentage(phase.done, phase.tasks.length);
  const currentLabel = phase === currentPhase ? "  ← etapa actual" : "";
  console.log(`Etapa ${phase.number} · ${phase.name}: ${phase.done}/${phase.tasks.length} (${percent}%) ${bar(percent)}${currentLabel}`);
}

if (!currentPhase) {
  console.log("\nTodas las etapas tienen sus hitos marcados como cerrados.");
  process.exit(0);
}

const openTasks = currentPhase.tasks.filter((task) => !task.done);
console.log(`\nEtapa actual: ${currentPhase.number} · ${currentPhase.name}`);
console.log("Siguientes hitos abiertos:");
for (const task of openTasks.slice(0, 5)) {
  console.log(`- ${task.id}: ${task.description}`);
}
