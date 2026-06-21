/**
 * Global "a cropper is open" flag. The avatar cropper renders in a portal
 * OUTSIDE the modal/popover that opened it, so base-ui treats any interaction
 * with the cropper (including dragging the image) as an outside-press and would
 * close that modal. Instead of stopping pointer events at the cropper overlay
 * (which also breaks react-easy-crop's drag), hosts check this flag in their
 * close handler and ignore the close while the cropper is open.
 */
let locked = false;

export function setCropLock(value: boolean): void {
  locked = value;
}

export function isCropLocked(): boolean {
  return locked;
}
