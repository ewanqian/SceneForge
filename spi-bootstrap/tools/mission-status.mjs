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
console.log(`Delivery:          ${status.delivery_status ?? status.status}`);
console.log(`Performance:       ${status.deadline}`);
console.log(`Current gate:      ${status.current_gate_deadline ?? 'not set'}`);
console.log(`Show freeze:       ${status.show_freeze ?? 'not set'}`);
console.log(`Full rehearsal:    ${status.full_rehearsal_gate ?? 'not set'}`);
console.log(`Phase:             ${status.phase} / ${status.phase_name}`);
console.log(`Current task:      ${status.current_task ?? activeMatch?.[1] ?? 'none'}`);
console.log(`Experiment:        ${status.current_experiment ?? 'none'}`);
console.log(`Bottleneck:        ${status.current_bottleneck}`);
console.log(`Primary mission:   ${status.primary_mission ?? 'not set'}`);
console.log(`After pass:        ${status.next_task_after_pass ?? 'not set'}`);
console.log(`Fallback:          ${status.fallback_if_gate_missed ?? 'not set'}`);
console.log(`Show artifact:     ${status.show_artifact}`);
console.log('');
console.log('PM instruction: do not open new scope before the active gate has evidence or an explicit fallback decision.');
