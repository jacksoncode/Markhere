import { Node, Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/** Regular expression patterns for popular media platforms */
const EMBED_PATTERNS: { name: string; regex: RegExp; embedUrl: (match: RegExpMatchArray) => string }[] = [
  {
    name: 'youtube',
    regex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?]\S*)?/,
    embedUrl: (m) => `https://www.youtube.com/embed/${m[1]}`,
  },
  {
    name: 'vimeo',
    regex: /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)(?:\?\S*)?/,
    embedUrl: (m) => `https://player.vimeo.com/video/${m[1]}`,
  },
  {
    name: 'bilibili',
    regex: /(?:https?:\/\/)?(?:www\.)?bilibili\.com\/video\/(BV[a-zA-Z0-9]+|av\d+)(?:\?\S*)?/,
    embedUrl: (m) => `https://player.bilibili.com/player.html?bvid=${m[1]}&page=1`,
  },
  {
    name: 'codepen',
    regex: /(?:https?:\/\/)?codepen\.io\/([^\/]+)\/pen\/([a-zA-Z0-9]+)(?:\/\S*)?/,
    embedUrl: (m) => `https://codepen.io/${m[1]}/embed/${m[2]}?default-tab=result`,
  },
  {
    name: 'codesandbox',
    regex: /(?:https?:\/\/)?codesandbox\.io\/s\/([a-zA-Z0-9-]+)(?:\?\S*)?/,
    embedUrl: (m) => `https://codesandbox.io/embed/${m[1]}?fontsize=14&hidenavigation=1`,
  },
];

/** Helper: check if a text line is a known embeddable URL */
export function matchMediaUrl(text: string): { platform: string; url: string; embedUrl: string } | null {
  for (const pattern of EMBED_PATTERNS) {
    const match = text.trim().match(pattern.regex);
    if (match) {
      return {
        platform: pattern.name,
        url: match[0],
        embedUrl: pattern.embedUrl(match),
      };
    }
  }
  return null;
}

/** MediaEmbed node — an iframe-based embed for supported platforms */
export const MediaEmbed = Node.create({
  name: 'mediaEmbed',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      url: { default: '' },
      platform: { default: '' },
      embedUrl: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="media-embed"]',
        getAttrs: (el) => {
          const div = el as HTMLElement;
          return {
            url: div.getAttribute('data-url') || '',
            platform: div.getAttribute('data-platform') || '',
            embedUrl: div.getAttribute('data-embed-url') || '',
          };
        },
      },
      {
        tag: 'iframe[data-type="media-embed"]',
        getAttrs: (el) => {
          const iframe = el as HTMLElement;
          return {
            url: iframe.getAttribute('data-url') || '',
            platform: iframe.getAttribute('data-platform') || '',
            embedUrl: iframe.getAttribute('src') || '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { url, platform, embedUrl } = HTMLAttributes;
    return [
      'div',
      {
        'data-type': 'media-embed',
        'data-url': url,
        'data-platform': platform,
        'data-embed-url': embedUrl,
        style: 'margin: 16px 0;',
      },
      [
        'iframe',
        {
          src: embedUrl,
          'data-type': 'media-embed',
          'data-url': url,
          'data-platform': platform,
          style: 'width: 100%; max-width: 640px; aspect-ratio: 16/9; border: none; border-radius: 8px;',
          allowfullscreen: 'true',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          loading: 'lazy',
        },
      ],
    ];
  },
});

const mediaEmbedPluginKey = new PluginKey('mediaAutoEmbed');

/**
 * Tiptap Extension wrapping the auto-embed paste handler.
 * When a media URL matching known embed patterns is pasted, it auto-converts
 * the pasted text into a mediaEmbed node (iframe embed).
 *
 * Supported: YouTube, Vimeo, Bilibili, CodePen, CodeSandbox
 */
export const MediaAutoEmbed = Extension.create({
  name: 'mediaAutoEmbed',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: mediaEmbedPluginKey,
        props: {
          handlePaste(view, event) {
            const text = event.clipboardData?.getData('text/plain');
            if (!text) return false;

            const lines = text.trim().split(/\n/);
            if (lines.length !== 1) return false;

            const match = matchMediaUrl(lines[0]);
            if (!match) return false;

            const { state, dispatch } = view;
            const nodeType = state.schema.nodes.mediaEmbed;
            if (!nodeType) return false;

            const node = nodeType.create({
              url: match.url,
              platform: match.platform,
              embedUrl: match.embedUrl,
            });

            dispatch(state.tr.replaceSelectionWith(node));
            return true;
          },
        },
      }),
    ];
  },
});
