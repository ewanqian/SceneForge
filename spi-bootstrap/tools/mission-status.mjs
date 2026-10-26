import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const status = JSON.parse(fs.readFileSync(path.join(root, 'harness', 'STATUS.json'), 'utf8'));
const tasks = fs.readFileSync(path.join(root, 'harness', 'TASKS.md'), 'utf8');

const activeMatch = tasks.match(/## (SPI-\d+ — [^\n]+)\nStatus: ACTIVE/);

console.log('Spatial Performance Instrument — Mission Control');
console.log('------------------------------------------------');
console.log(`Deadline:          ${status.deadline}`);
console.log(`Phase:             ${status.phase} / ${status.phase_name}`);
console.log(`Status:            ${status.status}`);
console.log(`Current task:      ${status.current_task ?? activeMatch?.[1] ?? 'none'}`);
console.log(`Experiment:        ${status.current_experiment ?? 'none'}`);
console.log(`Bottleneck:        ${status.current_bottleneck}`);
console.log(`After pass:        ${status.next_task_after_pass ?? 'not set'}`);
console.log(`Show artifact:     ${status.show_artifact}`);
console.log('');
console.log('Agent instruction: read harness/TASKS.md and the active experiment before starting work.');
