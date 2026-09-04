export const OPEN_COMMAND_PALETTE_EVENT = 'gaos:open-command-palette';

export function openCommandPalette(): void {
  window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT));
}
