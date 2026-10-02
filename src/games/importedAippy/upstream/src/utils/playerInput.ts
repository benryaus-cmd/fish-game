export interface JoystickInput {
  x: number; // -1 to 1
  y: number; // -1 to 1
  active: boolean;
  burst: boolean;
}

export class InputManager {
  private keys = new Set<string>();
  private joyPointerId: number | null = null;
  private burstPointerId: number | null = null;

  private joyOriginX = 0;
  private joyOriginY = 0;
  private joyCurrentX = 0;
  private joyCurrentY = 0;
  private joyRadius = 45;

  private joyActive = false;
  private burstActive = false;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleVisibility = this.handleVisibility.bind(this);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibility);
  }

  private handleKeyDown(e: KeyboardEvent) {
    this.keys.add(e.code);
    if (e.code === 'Space') {
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.code);
  }

  private handleBlur() {
    this.resetInput();
  }

  private handleVisibility() {
    if (document.hidden) {
      this.resetInput();
    }
  }

  resetInput() {
    this.keys.clear();
    this.joyActive = false;
    this.joyPointerId = null;
    this.burstActive = false;
    this.burstPointerId = null;
  }

  // Pointer joystick integration
  onJoyStart(pointerId: number, screenX: number, screenY: number) {
    this.joyPointerId = pointerId;
    this.joyOriginX = screenX;
    this.joyOriginY = screenY;
    this.joyCurrentX = screenX;
    this.joyCurrentY = screenY;
    this.joyActive = true;
  }

  onJoyMove(pointerId: number, screenX: number, screenY: number) {
    if (this.joyPointerId === pointerId) {
      this.joyCurrentX = screenX;
      this.joyCurrentY = screenY;
    }
  }

  onJoyEnd(pointerId: number) {
    if (this.joyPointerId === pointerId) {
      this.joyPointerId = null;
      this.joyActive = false;
    }
  }

  // Burst touch integration
  onBurstStart(pointerId: number) {
    this.burstPointerId = pointerId;
    this.burstActive = true;
  }

  onBurstEnd(pointerId: number) {
    if (this.burstPointerId === pointerId) {
      this.burstPointerId = null;
      this.burstActive = false;
    }
  }

  getKnobOffset(): { x: number; y: number; active: boolean } {
    if (!this.joyActive) return { x: 0, y: 0, active: false };
    const dx = this.joyCurrentX - this.joyOriginX;
    const dy = this.joyCurrentY - this.joyOriginY;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-3) return { x: 0, y: 0, active: true };
    const clamped = Math.min(dist, this.joyRadius);
    return {
      x: (dx / dist) * clamped,
      y: (dy / dist) * clamped,
      active: true,
    };
  }

  getInput(): JoystickInput {
    let dx = 0;
    let dy = 0;

    // Keyboard (WASD / Arrows)
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dx += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dy -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dy += 1;

    let burst = this.keys.has('Space') || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.burstActive;

    // Joystick thumb
    if (this.joyActive) {
      const jx = this.joyCurrentX - this.joyOriginX;
      const jy = this.joyCurrentY - this.joyOriginY;
      const dist = Math.hypot(jx, jy);
      const deadzone = 8;
      if (dist > deadzone) {
        const factor = Math.min(1, (dist - deadzone) / (this.joyRadius - deadzone));
        dx += (jx / dist) * factor;
        dy += (jy / dist) * factor;
      }
    }

    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }

    return {
      x: dx,
      y: dy,
      active: len > 0.05,
      burst,
    };
  }
}