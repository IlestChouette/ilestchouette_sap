#!/usr/bin/env node
// Generates a rapid "tac-tac-tac" owl bill-clicking alert sound as a WAV file
// Run: node scripts/generate-owl-sound.js

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const DURATION = 1.8; // seconds total (pattern + silence before loop)

const totalSamples = Math.floor(SAMPLE_RATE * DURATION);
const pcmData = new Int16Array(totalSamples);

// "tac" = short sharp click burst: quick attack, fast exponential decay
// 5 clicks in quick succession, then silence before the loop restarts

// Each "tac": 55ms click, 60ms gap between clicks
// Group of 5 tacs, then ~0.9s silence

const TAC_DURATION   = 0.055; // seconds per click
const TAC_GAP        = 0.060; // silence between clicks
const NUM_TACS       = 5;
const TAC_FREQ       = 1400;  // Hz – crisp, high-pitched click
const TAC_FREQ2      = 900;   // Hz – 2nd harmonic for richness

let phase = 0;

for (let i = 0; i < totalSamples; i++) {
  const t = i / SAMPLE_RATE;
  let sample = 0;

  for (let k = 0; k < NUM_TACS; k++) {
    const start = k * (TAC_DURATION + TAC_GAP);
    const end   = start + TAC_DURATION;

    if (t >= start && t < end) {
      const localT = t - start;

      // Sharp attack (first 8%) then fast exponential decay
      const attackEnd = TAC_DURATION * 0.08;
      let env;
      if (localT < attackEnd) {
        env = localT / attackEnd;
      } else {
        env = Math.exp(-18 * (localT - attackEnd));
      }

      // Two-component click: main tone + slightly lower harmonic
      const phaseMain = 2 * Math.PI * TAC_FREQ  * localT;
      const phaseSub  = 2 * Math.PI * TAC_FREQ2 * localT;
      sample = env * 0.75 * (0.7 * Math.sin(phaseMain) + 0.3 * Math.sin(phaseSub));
      break;
    }
  }

  // rest of duration: silence (loop buffer)
  pcmData[i] = Math.max(-32767, Math.min(32767, Math.round(sample * 32767)));
}

// ── Write WAV ─────────────────────────────────────────────────────────────
const dataBytes   = pcmData.buffer.byteLength;
const headerBytes = 44;
const buf         = Buffer.alloc(headerBytes + dataBytes);

buf.write('RIFF', 0);
buf.writeUInt32LE(buf.length - 8, 4);
buf.write('WAVE', 8);

buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);                                               // Subchunk1Size
buf.writeUInt16LE(1, 20);                                                // PCM
buf.writeUInt16LE(NUM_CHANNELS, 22);
buf.writeUInt32LE(SAMPLE_RATE, 24);
buf.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * BITS_PER_SAMPLE / 8, 28); // ByteRate
buf.writeUInt16LE(NUM_CHANNELS * BITS_PER_SAMPLE / 8, 32);               // BlockAlign
buf.writeUInt16LE(BITS_PER_SAMPLE, 34);

buf.write('data', 36);
buf.writeUInt32LE(dataBytes, 40);
Buffer.from(pcmData.buffer).copy(buf, 44);

const outPath = path.join(__dirname, '..', 'assets', 'sounds', 'owl.wav');
fs.writeFileSync(outPath, buf);
console.log(`✅  owl.wav generated → ${outPath}`);
console.log(`    Duration : ${DURATION}s   Samples : ${totalSamples}   Size : ${buf.length} bytes`);
