import { describe, expect, it } from 'vitest';
import { getBaseTileUrl } from './DesktopMap';

describe('getBaseTileUrl', () => {
  it('uses the light tile set by default', () => {
    expect(
      getBaseTileUrl({
        colorMode: 'light',
        supportsHiDpiTiles: false,
        zoomLevel: 13,
      })
    ).toContain('light_nolabels');
  });

  it('uses the dark tile set in dark mode', () => {
    expect(
      getBaseTileUrl({
        colorMode: 'dark',
        supportsHiDpiTiles: false,
        zoomLevel: 13,
      })
    ).toContain('dark_nolabels');
  });

  it('uses the retina tile variant when high-density tiles are available at high zoom', () => {
    expect(
      getBaseTileUrl({
        colorMode: 'dark',
        supportsHiDpiTiles: true,
        zoomLevel: 16,
      })
    ).toContain('@2x');
  });
});
