import { Injectable } from '@nestjs/common';
import { Resvg } from '@resvg/resvg-js';
import { join } from 'node:path';
import { buildTrendSvg } from './chart-svg';
import { TrendResponse } from './dashboard.types';

// dist/dashboard/ -> project root/assets/fonts (fonts are bundled so the PNG never depends on system fonts)
const FONT_DIR = join(__dirname, '..', '..', 'assets', 'fonts');

@Injectable()
export class ChartExportService {
  /** Renders the "Revenue Trend" card for the given data to a PNG image. */
  renderPng(trend: TrendResponse): Buffer {
    const resvg = new Resvg(buildTrendSvg(trend), {
      fitTo: { mode: 'width', value: 2400 }, // 2x for a crisp image
      background: '#ffffff',
      font: {
        fontFiles: [join(FONT_DIR, 'DejaVuSans.ttf'), join(FONT_DIR, 'DejaVuSans-Bold.ttf')],
        loadSystemFonts: false,
        defaultFontFamily: 'DejaVu Sans',
      },
    });
    return resvg.render().asPng();
  }
}
