import type { SVGProps } from 'react';

/**
 * The engraved icon system.
 *
 * Every mark is line work on the same 24-unit grid at the same stroke weight,
 * so a temple, a scroll and a pottery shard read as plates from one
 * archaeological catalogue rather than as a pile of borrowed glyphs. Nothing
 * here is filled except where a fill is the whole point of the shape (the
 * half-disc of the system theme), and nothing carries colour of its own: an
 * icon inherits from the control it sits in, which is what keeps the active
 * tab, a list row and a card button consistent without a rule each.
 *
 * Icons are decoration. Every control that uses one also carries a text label
 * or an accessible name, so an icon that fails to read costs nothing.
 */
export type IconName =
  // navigation
  | 'temple'
  | 'scroll'
  | 'stele'
  | 'shards'
  | 'columns'
  | 'rosette'
  // study modes and alphabet modes
  | 'codex'
  | 'target'
  | 'flame'
  | 'chisel'
  | 'ear'
  | 'stylus'
  // controls
  | 'speaker'
  | 'info'
  | 'lock'
  | 'check'
  | 'plus'
  | 'back'
  | 'forward'
  | 'sun'
  | 'moon'
  | 'half-disc'
  // category marks
  | 'olive'
  | 'tally'
  | 'amphora'
  | 'family'
  | 'figure'
  | 'sunrise'
  | 'runner'
  | 'ewer'
  | 'mortar'
  | 'beacon'
  | 'bolt'
  | 'diamonds'
  | 'motion'
  | 'wheel'
  | 'compass'
  | 'basket'
  | 'pomegranate';

const PATHS: Record<IconName, JSX.Element> = {
  temple: (
    <>
      <path d="M3 10 12 4l9 6" />
      <path d="M5.5 10v9M10 10v9M14 10v9M18.5 10v9" />
      <path d="M3.5 19.5h17" />
    </>
  ),
  scroll: (
    <>
      <path d="M6 5.5A1.5 1.5 0 0 1 7.5 4h9A1.5 1.5 0 0 1 18 5.5v13A1.5 1.5 0 0 1 16.5 20h-9A1.5 1.5 0 0 1 6 18.5z" />
      <path d="M9 9h6M9 12h6M9 15h4" />
    </>
  ),
  stele: (
    <>
      <path d="M6.5 20.5V9a5.5 5.5 0 0 1 11 0v11.5z" />
      <path d="M9.5 11h5M9.5 14h5M9.5 17h3" />
    </>
  ),
  shards: (
    <>
      <path d="M9 3.5h9.5v11" />
      <path d="M4.5 7.5h10v13h-10z" />
      <path d="M7.5 11.5h4M7.5 15h4" />
    </>
  ),
  columns: (
    <>
      <path d="M3 20.5h18" />
      <path d="M5 20.5v-6h3v6M10.5 20.5V8.5h3v12M16 20.5v-9h3v9" />
      <path d="M4.5 14.5h4M10 8.5h4M15.5 11.5h4" />
    </>
  ),
  rosette: (
    <>
      <circle cx="12" cy="12" r="4.6" />
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 2.6v3.2M12 18.2v3.2M2.6 12h3.2M18.2 12h3.2" />
      <path d="m5.4 5.4 2.3 2.3M16.3 16.3l2.3 2.3M18.6 5.4l-2.3 2.3M7.7 16.3l-2.3 2.3" />
    </>
  ),
  codex: (
    <>
      <path d="M12 6.5C10 5 7.5 4.3 4 4.3v13c3.5 0 6 .7 8 2.2 2-1.5 4.5-2.2 8-2.2v-13c-3.5 0-6 .7-8 2.2z" />
      <path d="M12 6.5v13" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
  flame: (
    <>
      <path d="M12 3c3 3.8 5 5.6 5 9a5 5 0 0 1-10 0c0-2 .9-3.6 2.4-5" />
      <path d="M12 12.4c1.2 1.4 2 2.2 2 3.4a2 2 0 0 1-4 0c0-1 .8-1.9 2-3.4" />
    </>
  ),
  chisel: (
    <>
      <path d="M9.8 3.5h4.4v9.2L12 16l-2.2-3.3z" />
      <path d="M9.8 8.5h4.4" />
      <path d="M6 18.5 7.6 17M18 18.5 16.4 17M12 19.5v2" />
    </>
  ),
  ear: (
    <>
      <path d="M8.5 21v-2.4a4.5 4.5 0 0 1-1.5-3.4V10a5 5 0 0 1 10 0c0 3.2-3 3.6-3 6.2a2.2 2.2 0 0 1-2.2 2.2" />
      <path d="M10 10a2 2 0 0 1 4 0" />
    </>
  ),
  stylus: (
    <>
      <path d="m4 20 1.2-4.3L16 5l3 3L8.3 18.8z" />
      <path d="m14 7 3 3" />
    </>
  ),
  speaker: (
    <>
      <path d="M4 9.2h3.2L12 5.2v13.6l-4.8-4H4z" />
      <path d="M15.6 9.4a4 4 0 0 1 0 5.2M18.2 7.2a7.5 7.5 0 0 1 0 9.6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 11v5.4" />
      <path d="M12 7.4h.01" />
    </>
  ),
  lock: (
    <>
      <path d="M5.8 10.8h12.4v9.4H5.8z" />
      <path d="M9 10.8V8a3 3 0 0 1 6 0v2.8" />
      <path d="M12 14.4v2.4" />
    </>
  ),
  check: <path d="m5 12.4 4.8 4.8L19 6.6" />,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  back: <path d="M15 4.5 7.5 12l7.5 7.5" />,
  forward: <path d="M9 4.5 16.5 12 9 19.5" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4.4" />
      <path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6" />
      <path d="m5.6 5.6 1.9 1.9M16.5 16.5l1.9 1.9M18.4 5.6l-1.9 1.9M7.5 16.5l-1.9 1.9" />
    </>
  ),
  moon: <path d="M19 14.4A7.6 7.6 0 0 1 9.6 5a7.6 7.6 0 1 0 9.4 9.4z" />,
  'half-disc': (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 3.6a8.4 8.4 0 0 1 0 16.8z" fill="currentColor" stroke="none" />
    </>
  ),
  olive: (
    <>
      <path d="M5 19.5C8 13 12.5 8 19 5" />
      <path d="M8.4 14.8c-.6-1.9.4-3.6 2.6-4.1 0 2.2-1 3.6-2.6 4.1zM12.6 10.4c-.2-2 1-3.5 3.3-3.6-.3 2.2-1.5 3.4-3.3 3.6zM10.9 17.6c-1.6-1.2-1.8-3.1-.3-4.6 1 1.9 1 3.5.3 4.6z" />
    </>
  ),
  tally: (
    <>
      <path d="M5.5 6.5v11M9.5 6.5v11M13.5 6.5v11M17.5 6.5v11" />
      <path d="M4 17.5 19 6.5" />
    </>
  ),
  amphora: (
    <>
      <path d="M9 3.8h6M10 3.8v2.4c-2 1.3-3.2 3.4-3.2 5.9 0 3.3 2.3 5.7 5.2 5.7s5.2-2.4 5.2-5.7c0-2.5-1.2-4.6-3.2-5.9V3.8" />
      <path d="M10 17.8v2.4h4v-2.4" />
      <path d="M6.9 9.4C5.4 9.8 4.8 11 5.4 12.2M17.1 9.4c1.5.4 2.1 1.6 1.5 2.8" />
    </>
  ),
  family: (
    <>
      <circle cx="7.5" cy="7" r="2.4" />
      <circle cx="16.5" cy="7" r="2.4" />
      <path d="M3.5 20.5v-3.4a4 4 0 0 1 8 0v3.4M12.5 20.5v-3.4a4 4 0 0 1 8 0v3.4" />
    </>
  ),
  figure: (
    <>
      <circle cx="12" cy="5.6" r="2.6" />
      <path d="M12 8.2v7.4M7.5 11.5 12 10l4.5 1.5M9.5 20.8 12 15.6l2.5 5.2" />
    </>
  ),
  sunrise: (
    <>
      <path d="M3 19.5h18" />
      <path d="M6.8 15.6a5.2 5.2 0 0 1 10.4 0" />
      <path d="M12 4v2.6M4.8 7.6l1.8 1.8M19.2 7.6l-1.8 1.8" />
    </>
  ),
  runner: (
    <>
      <circle cx="14.4" cy="5.2" r="2.2" />
      <path d="M15.6 8.2 11 11l1.6 3.4-2.4 5.4M12.6 14.4l4 1.4 1 4M11 11 6.6 12.4" />
    </>
  ),
  ewer: (
    <>
      <path d="M8.4 6.2h6.2c1.8 1.4 2.8 3.4 2.8 5.8 0 4-2.4 6.6-5.9 6.6S5.6 16 5.6 12c0-2.4 1-4.4 2.8-5.8z" />
      <path d="M9.4 6.2V4h4.2v2.2" />
      <path d="M17.2 9.4c1.6 0 2.6 1 2.6 2.4s-1 2.4-2.4 2.4" />
    </>
  ),
  mortar: (
    <>
      <path d="M4.5 10.5h15c0 4.2-2.4 7.4-5.6 8.2v1.8h-3.8v-1.8c-3.2-.8-5.6-4-5.6-8.2z" />
      <path d="m13.5 9.5 5-5.5" />
    </>
  ),
  beacon: (
    <>
      <path d="M12 3.2c1.9 2.4 3.2 3.6 3.2 5.8a3.2 3.2 0 0 1-6.4 0c0-1.3.6-2.3 1.6-3.2" />
      <path d="M8 12.4h8l-1 8H9z" />
      <path d="M6.5 20.4h11" />
    </>
  ),
  bolt: <path d="M13.4 3 6.6 13.2h4.6L10.6 21l6.8-10.2h-4.6z" />,
  diamonds: (
    <>
      <path d="m6 12 3-3.4 3 3.4-3 3.4zM15 12l3-3.4 3 3.4-3 3.4z" />
      <path d="M3 12h1.5M12.5 12h1.5" />
    </>
  ),
  motion: (
    <>
      <path d="M4 8.5h11M4 15.5h8" />
      <path d="m14.5 4.5 5 4-5 4M12 11.5l5 4-5 4" />
    </>
  ),
  wheel: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 3.4v6.2M12 14.4v6.2M3.4 12h6.2M14.4 12h6.2" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="m12 5 1.9 5.1L19 12l-5.1 1.9L12 19l-1.9-5.1L5 12l5.1-1.9z" />
    </>
  ),
  basket: (
    <>
      <path d="M3.6 9.5h16.8l-1.6 10.2H5.2z" />
      <path d="M8 9.5 10 4M16 9.5 14 4" />
      <path d="M8.6 13v3.4M12 13v3.4M15.4 13v3.4" />
    </>
  ),
  pomegranate: (
    <>
      <path d="M12 6.6c4 0 6.6 2.9 6.6 6.6S15.8 20.4 12 20.4 5.4 16.9 5.4 13.2 8 6.6 12 6.6z" />
      <path d="M12 6.6V3.6M10 4.2l2 2 2-2" />
      <path d="M9.6 12.6h.01M12 15h.01M14.4 12.6h.01" />
    </>
  ),
};

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: IconName;
  /**
   * Names the icon for assistive technology. Omit it — the default — whenever
   * the surrounding control already has a label, which is the normal case
   * here; a decorative mark should not double every button's announcement.
   */
  title?: string;
  className?: string;
};

export default function Icon({ name, title, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={'ico' + (className ? ' ' + className : '')}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}
