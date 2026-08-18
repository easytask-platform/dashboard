import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom (v30) has no <dialog> method implementations yet.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true
}
HTMLDialogElement.prototype.show ??= function (this: HTMLDialogElement) {
  this.open = true
}
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false
  this.dispatchEvent(new Event('close'))
}

// jsdom Blob/File have no stream(); undici's Response body extraction needs it
// (hit by multipart uploads through MSW).
Blob.prototype.stream ??= function (this: Blob) {
  return new ReadableStream({
    start: async (controller) => {
      controller.enqueue(new Uint8Array(await this.arrayBuffer()))
      controller.close()
    },
  }) as ReturnType<Blob['stream']>
}

// jsdom has no matchMedia; the theme module reads prefers-color-scheme through it.
window.matchMedia ??= ((query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }) as MediaQueryList) as typeof window.matchMedia

// jsdom has no createObjectURL; the Avatar component feeds fetched blobs to <img>.
URL.createObjectURL ??= () => 'blob:jsdom'
URL.revokeObjectURL ??= () => {}

afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})
