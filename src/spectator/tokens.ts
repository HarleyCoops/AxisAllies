/**
 * Original spectator silhouettes — hand-drawn schematic marks.
 * Not traced from official plastic sculpts, box art, or licensed fonts.
 */

import { UNIT_TYPES, type UnitType } from "../data/catalog.ts";

const VIEW = `viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"`;

function svg(inner: string): string {
  return `<svg class="glyph" ${VIEW} fill="currentColor">${inner}</svg>`;
}

function unitInner(type: UnitType): string {
  switch (type) {
    case "infantry":
      // Standing figure, helmet, rifle to the right.
      return `
        <path d="M8 1.1c1.15 0 1.85 1.15 1.35 2.15H6.65C6.15 2.25 6.85 1.1 8 1.1z"/>
        <path d="M6.15 3.5h3.7l.55 4.15-1.25.4V11l2.25 4.15h-1.55L8 11.55l-1.85 4.1H4.6L6.85 11V8.05l-1.25-.4z"/>
        <path d="M10.15 6.05 15.1 5.15l.25.85-4.95.95z"/>`;
    case "artillery":
      // Field gun: diagonal barrel on a wheeled carriage.
      return `
        <path d="M1.6 6.2 13.4 3.35l.7 1.55-10.4 3.1z"/>
        <path d="M4.1 8.1h3.6l.85 3.2H4.55z"/>
        <circle cx="5.6" cy="12.15" r="2.35"/>
        <path d="M8.4 10.3h2.1v1.35H8.4z"/>`;
    case "tank":
      // Side-view hull, turret, gun, track bar.
      return `
        <path d="M5.1 4.15h5.15l.95 2.55H4.35z"/>
        <path d="M11.15 5.15h4.2v1.15h-4.2z"/>
        <path d="M1.2 8.1 3.05 6.55h9.95L14.8 8.1V11H1.2z"/>
        <path d="M1.05 11.15h13.9v2.2H1.05z"/>
        <path d="M2.3 12.7h1.15v.55H2.3zm3.1 0h1.15v.55H5.4zm3.15 0h1.15v.55H8.55zm3.1 0H12.8v.55h-1.15z" fill="#1c1610" fill-opacity=".35"/>`;
    case "aaa":
      // Vertical barrel on a low mount.
      return `
        <path d="M7.15 1.2h1.7l.45 8.15H6.7z"/>
        <path d="M5.4 9.1h5.2l.7 1.55H4.7z"/>
        <path d="M2.4 12.35 4.7 10.7h6.6l2.3 1.65-1.15 1.85H3.55z"/>`;
    case "fighter":
      // Top-down monoplane.
      return `
        <path d="M7.25 1.15h1.5l.55 8.2L8 14.85 6.7 9.35z"/>
        <path d="M1.05 6.15h13.9l-.85 2.15H1.9z"/>
        <path d="M6.05 11.15h3.9l-.45 1.55H6.5z"/>`;
    case "bomber":
      // Longer fuselage, broad wing, four engine nubs.
      return `
        <path d="M7.05.85h1.9l.75 9.4L8 15.2 6.3 10.25z"/>
        <path d="M.4 5.85h15.2l-.7 2.7H1.1z"/>
        <path d="M2.15 5.15h1.35v.75H2.15zm3.2 0h1.35v.75H5.35zm5.95 0h1.35v.75h-1.35zm-3.15 0H9.85v.75H8.35z"/>
        <path d="M5.45 11.2h5.1l-.55 1.7H6z"/>`;
    case "submarine":
      // Side profile with sail and periscope.
      return `
        <path d="M8.2 1.05h.85v2.2H8.2z"/>
        <path d="M6.85 3.15h2.55v2.35H6.85z"/>
        <path d="M1.05 7.85c0-1.7 2.7-2.75 6.95-2.75s6.95 1.05 6.95 2.75-2.7 2.75-6.95 2.75S1.05 9.55 1.05 7.85z"/>`;
    case "transport":
      // Boxy hull and amidships cabin — no guns.
      return `
        <path d="M5.7 4.55h5.1v3.7H5.7z"/>
        <path d="M1.15 8.55 2.7 12.55h10.65L15 8.55z"/>
        <path d="M3.3 7.35h1.6v1.2H3.3z"/>`;
    case "destroyer":
      // Slim hull, one funnel, one forward gun.
      return `
        <path d="M.85 9.15 3.05 12.2h10.3L15.35 8.7h-1.2L12.2 10.2H3.55L2.2 8.85z"/>
        <path d="M3.45 7.35h2.15v1.15H3.45z"/>
        <path d="M6.2 5.85h2.15v4.15H6.2z"/>
        <path d="M8.7 4.35h1.35v5.65H8.7z"/>`;
    case "cruiser":
      // Longer hull, two funnels, two guns.
      return `
        <path d="M.55 9.05 2.85 12.35h10.55L15.55 8.55h-1.15L12.4 10.25H3.35L1.85 8.7z"/>
        <path d="M2.85 7.2h2.2v1.2H2.85zm8.15 0h2.15v1.2H11z"/>
        <path d="M6.05 4.25h1.35v5.8H6.05zm2.55 0h1.35v5.8H8.6z"/>`;
    case "battleship":
      // Heavy hull, three turret blocks, mid superstructure.
      return `
        <path d="M.4 8.95 2.7 12.55h10.7L15.65 8.45h-1.05L12.55 10.3H3.2L1.55 8.6z"/>
        <path d="M2.35 6.55h2.35v2.05H2.35zm4.55 0h2.2v2.05H6.9zm4.45 0h2.3v2.05h-2.3z"/>
        <path d="M6.55 3.85h2.9v2.75H6.55z"/>`;
    case "carrier":
      // Flat flight deck, starboard island, hull below.
      return `
        <path d="M1.05 4.35h13.9v3.35H1.05z"/>
        <path d="M11.35 2.55h2.15v1.85h-2.15z"/>
        <path d="M.7 8.85 2.45 12.35h11.15L15.3 8.85z"/>`;
    case "factory":
      return factoryInner();
    default: {
      const _never: never = type;
      throw new Error(`Unhandled unit type: ${String(_never)}`);
    }
  }
}

function factoryInner(): string {
  // Sawtooth roof and two stacks — industrial complex mark, not a sculpt.
  return `
    <path d="M3.15.95h1.45v3.4H3.15zm8.1.55h1.45v2.85h-1.45z"/>
    <path d="M1.2 6.85 4.05 3.4l.7 3.45L7.15 3.4l.7 3.45 2.55-3.45.7 3.45 2.5-3.45.85 3.45H1.2z"/>
    <path d="M1.2 6.85h13.6V14.4H1.2z"/>
    <path d="M3.2 8.7h2.15v3.4H3.2zm3.7 0h2.15v3.4H6.9zm3.75 1.35h2.05v2.05h-2.05z" fill="#1c1610" fill-opacity=".28"/>`;
}

function isUnitType(type: string): type is UnitType {
  return (UNIT_TYPES as readonly string[]).includes(type);
}

/** Count + glyph stack mark. Unknown frame types get a spare diamond. */
export function stackGlyph(type: string): string {
  if (isUnitType(type)) return svg(unitInner(type));
  return svg(`<path d="M8 2.1 13.6 8 8 13.9 2.4 8z"/>`);
}

export function factoryGlyph(): string {
  return svg(factoryInner());
}
