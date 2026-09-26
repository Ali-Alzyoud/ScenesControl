// Subtitle text colours offered in Settings and on the remote. The value is stored as-is in
// fontConfig.color and used directly as the CSS colour.
export const SUBTITLE_COLORS = [
    { value: 'white', label: 'White' },
    { value: '#ffe14d', label: 'Yellow' },
    { value: '#5ce1ff', label: 'Cyan' },
    { value: '#7dff9a', label: 'Green' },
    { value: '#ff9ad5', label: 'Pink' },
];
export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 80;
export const clampFontSize = (n) => Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(n)));
export const clampOpacity = (n) => Math.min(1, Math.max(0, Math.round(n * 10) / 10));
