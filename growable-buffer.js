class GrowableTypedBuffer {
    constructor(Type = Float32Array, chunkElements = 65536) {
        this.Type = Type;
        this.chunkElements = chunkElements;
        this.chunks = [];
        this.current = new Type(this.chunkElements);
        this.offset = 0;
    }

    ensureSpace(count) {
        if (this.offset + count > this.chunkElements) {
            this.chunks.push(this.current.subarray(0, this.offset)); // view, no copy
            this.current = new this.Type(this.chunkElements);
            this.offset = 0;
        }
    }

    write(...values) {
        const count = values.length;
        if (count === 0) return;

        let off = this.offset;
        const len = this.chunkElements;

        if (off + count > len) {
            this.ensureSpace(count);
            off = this.offset;
        }

        const cur = this.current;
        for (let i = 0; i < count; i++) {
            cur[off + i] = values[i];
        }
        this.offset = off + count;
    }

    write2(a, b) {
        const off = this.offset;
        if (off + 2 > this.chunkElements) {
            this.ensureSpace(2);
            this.current[this.offset++] = a;
            this.current[this.offset++] = b;
        } else {
            this.current[off] = a;
            this.current[off + 1] = b;
            this.offset = off + 2;
        }
    }

    toTypedArray() {
        const parts = this.chunks.slice();
        if (this.offset > 0) parts.push(this.current.subarray(0, this.offset));

        const total = parts.reduce((s, c) => s + c.length, 0);
        const out = new this.Type(total);
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
console.time("B: streaming growable buffer");
const gb = new GrowableTypedBuffer(Float32Array, 65536);
for (let i = 0; i < POINT_COUNT; i++) {
    const x = arr[i * 2];
    if (x <= 0.5) continue;
    gb.write2(x, arr[i * 2 + 1]);
}
const outB = gb.toTypedArray();
console.timeEnd("B: streaming growable buffer");

// --------------------------------------------------
// Verify correctness
// --------------------------------------------------
console.log("JS filtered count =", objs.length);
console.log("Streaming filtered count =", outB.length / 2);
