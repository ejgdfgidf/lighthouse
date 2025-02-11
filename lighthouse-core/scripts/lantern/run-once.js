#!/usr/bin/env node
/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import fs from 'fs';
import path from 'path';

import PredictivePerf from '../../audits/predictive-perf.js';
import Simulator from '../../lib/dependency-graph/simulator/simulator.js';
import traceSaver from '../../lib/lantern-trace-saver.js';
import {LH_ROOT, readJson} from '../../../root.js';

if (process.argv.length !== 4) throw new Error('Usage $0 <trace file> <devtools file>');

async function run() {
  const tracePath = path.resolve(process.cwd(), process.argv[2]);
  const traces = {defaultPass: readJson(tracePath)};
  const devtoolsLogs = {defaultPass: readJson(path.resolve(process.cwd(), process.argv[3]))};
  const artifacts = {traces, devtoolsLogs, GatherContext: {gatherMode: 'navigation'}};
  const context = {computedCache: new Map(), settings: {locale: 'en-us'}};

  // @ts-expect-error - We don't need the full artifacts or context.
  const result = await PredictivePerf.audit(artifacts, context);
  if (!result.details || result.details.type !== 'debugdata') {
    throw new Error('Unexpected audit details from PredictivePerf');
  }
  process.stdout.write(JSON.stringify(result.details.items[0], null, 2));

  // Dump the TTI graph with simulated timings to a trace if LANTERN_DEBUG is enabled
  const pessimisticTTINodeTimings = Simulator.ALL_NODE_TIMINGS.get('pessimisticInteractive');
  if (process.env.LANTERN_DEBUG && pessimisticTTINodeTimings) {
    const outputTraceFile = path.basename(tracePath).replace(/.trace.json$/, '.lantern.trace.json');
    const outputTracePath = path.join(LH_ROOT, '.tmp', outputTraceFile);
    const trace = traceSaver.convertNodeTimingsToTrace(pessimisticTTINodeTimings);
    fs.writeFileSync(outputTracePath, JSON.stringify(trace, null, 2));
  }
}

await run();
