class GrowableFloatBuffer {
  constructor(chunkFloats = 65536) { // number of float32 elements
    this.chunkFloats = chunkFloats;
    this.chunks = [];
    this.current = new Float32Array(this.chunkFloats);
    this.offset = 0;
  }

  ensureSpace(count) {
    if (this.offset + count > this.chunkFloats) {
      this.chunks.push(this.current.subarray(0, this.offset)); // view, no copy
      this.current = new Float32Array(this.chunkFloats);
      this.offset = 0;
    }
  }

  write2(x, y) {
    const off = this.offset;
    if (off + 2 > this.chunkFloats) {
      this.ensureSpace(2);
      this.current[this.offset++] = x;
      this.current[this.offset++] = y;
    } else {
      this.current[off] = x;
      this.current[off + 1] = y;
      this.offset = off + 2;
    }
  }

  toFloat32Array() {
    const parts = this.chunks.slice();
    if (this.offset > 0) parts.push(this.current.subarray(0, this.offset));

    const total = parts.reduce((s, c) => s + c.length, 0);
    const out = new Float32Array(total);
    let pos = 0;
    for (let i = 0; i < parts.length; i++) {
      const c = parts[i];
      out.set(c, pos);
      pos += c.length;
    }
    return out;
  }
}

// --------------------------------------------------
// Generate 1,000,000 random {x, y} pairs (float32)
// --------------------------------------------------
const POINT_COUNT = 1_000_000;
const buf = new ArrayBuffer(POINT_COUNT * 8);
const arr = new Float32Array(buf);
for (let i = 0; i < POINT_COUNT * 2; i++) {
  arr[i] = Math.random();
}

// --------------------------------------------------
// A: classic JS object filtering
// --------------------------------------------------
console.time("A: JS array filter + rebuild");
const objs = [];
for (let i = 0; i < POINT_COUNT; i++) {
  const x = arr[i * 2];
  const y = arr[i * 2 + 1];
  if (x > 0.5) objs.push({ x, y });
}
const outA = new Float32Array(objs.length * 2);
for (let i = 0; i < objs.length; i++) {
  const p = objs[i];
  outA[i * 2] = p.x;
  outA[i * 2 + 1] = p.y;
}
console.timeEnd("A: JS array filter + rebuild");

// --------------------------------------------------
// B: optimized streaming filter → growable buffer
// --------------------------------------------------
console.time("B: streaming growable float buffer");
const gb = new GrowableFloatBuffer(65536);
for (let i = 0; i < POINT_COUNT; i++) {
  const x = arr[i * 2];
  if (x <= 0.5) continue;
  gb.write2(x, arr[i * 2 + 1]);
}
const outB = gb.toFloat32Array();
console.timeEnd("B: streaming growable float buffer");

// --------------------------------------------------
// Verify correctness
// --------------------------------------------------
console.log("JS filtered count =", objs.length);
console.log("Streaming filtered count =", outB.length / 2);
