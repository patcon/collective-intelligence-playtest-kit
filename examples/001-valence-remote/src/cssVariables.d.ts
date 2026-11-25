import 'react';

/** CSS custom properties set through `style`. */
declare module 'react' {
  interface CSSProperties {
    /** A valence's fill (`valenceColor`), for a Kumo Meter's indicator to read. */
    '--valence-color'?: string;
  }
}
