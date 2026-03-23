import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

class ResizeObserverStub {
  constructor(callback) {
    this.callback = callback;
  }

  observe(target) {
    this.callback([
      {
        contentRect: target.getBoundingClientRect(),
        target,
      },
    ]);
  }

  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  writable: true,
  value: ResizeObserverStub,
});

Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  configurable: true,
  value() {
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 960,
      bottom: 620,
      width: 960,
      height: 620,
      toJSON() {
        return this;
      },
    };
  },
});
