'use strict';
/**
 * Binary heap sobre Int32Array de indices LOCALES (spec §7.2). La
 * prioridad se lee de un array externo (fScore, Float32Array) indexado
 * por el mismo indice local -- nada de heap de objetos ni de Map.
 */
class TypedBinaryHeap {
  constructor(initialCapacity, priorityArray) {
    this.priorityArray = priorityArray;
    this.data = new Int32Array(Math.max(16, initialCapacity));
    this.size = 0;
  }

  isEmpty() {
    return this.size === 0;
  }

  _ensureCapacity(n) {
    if (n <= this.data.length) return;
    const bigger = new Int32Array(this.data.length * 2);
    bigger.set(this.data);
    this.data = bigger;
  }

  push(idx) {
    this._ensureCapacity(this.size + 1);
    this.data[this.size] = idx;
    this._bubbleUp(this.size);
    this.size++;
  }

  pop() {
    const data = this.data;
    const top = data[0];
    this.size--;
    data[0] = data[this.size];
    this._bubbleDown(0);
    return top;
  }

  _bubbleUp(i) {
    const data = this.data;
    const p = this.priorityArray;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (p[data[parent]] <= p[data[i]]) break;
      const tmp = data[parent];
      data[parent] = data[i];
      data[i] = tmp;
      i = parent;
    }
  }

  _bubbleDown(i) {
    const data = this.data;
    const p = this.priorityArray;
    const n = this.size;
    for (;;) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && p[data[l]] < p[data[smallest]]) smallest = l;
      if (r < n && p[data[r]] < p[data[smallest]]) smallest = r;
      if (smallest === i) break;
      const tmp = data[smallest];
      data[smallest] = data[i];
      data[i] = tmp;
      i = smallest;
    }
  }
}

module.exports = TypedBinaryHeap;
