import { describe, it, expect, beforeEach } from 'vitest';
import { useWikiLinkStore, WikiLinkInfo } from './wikiLinkStore';

describe('useWikiLinkStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useWikiLinkStore.setState({ links: [], currentPage: null });
  });

  describe('initial state', () => {
    it('has empty links array', () => {
      expect(useWikiLinkStore.getState().links).toEqual([]);
    });

    it('has null as current page', () => {
      expect(useWikiLinkStore.getState().currentPage).toBeNull();
    });
  });

  describe('addLink', () => {
    it('adds a new link entry to the store', () => {
      useWikiLinkStore.getState().addLink('pageA', 'pageB', 'Page B', 0);

      const { links } = useWikiLinkStore.getState();
      expect(links).toHaveLength(1);
      expect(links[0]).toEqual({
        source: 'pageA',
        target: 'pageB',
        display: 'Page B',
        position: 0,
      });
    });

    it('does not add duplicate links with same source, target, and position', () => {
      useWikiLinkStore.getState().addLink('pageA', 'pageB', 'Display', 10);
      useWikiLinkStore.getState().addLink('pageA', 'pageB', 'Display', 10);

      expect(useWikiLinkStore.getState().links).toHaveLength(1);
    });

    it('allows links with same source and target but different positions', () => {
      useWikiLinkStore.getState().addLink('pageA', 'pageB', 'B1', 5);
      useWikiLinkStore.getState().addLink('pageA', 'pageB', 'B2', 20);

      expect(useWikiLinkStore.getState().links).toHaveLength(2);
    });
  });

  describe('removeLink', () => {
    it('removes a link matching source and target', () => {
      useWikiLinkStore.getState().addLink('src', 'dest1', 'D1', 0);
      useWikiLinkStore.getState().addLink('src', 'dest2', 'D2', 1);

      useWikiLinkStore.getState().removeLink('src', 'dest1');

      const { links } = useWikiLinkStore.getState();
      expect(links).toHaveLength(1);
      expect(links[0].target).toBe('dest2');
    });

    it('removes all links with matching source and target', () => {
      useWikiLinkStore.getState().addLink('src', 'target', 'T1', 0);
      useWikiLinkStore.getState().addLink('src', 'target', 'T2', 50);

      useWikiLinkStore.getState().removeLink('src', 'target');

      expect(useWikiLinkStore.getState().links).toHaveLength(0);
    });

    it('does nothing when no matching link exists', () => {
      useWikiLinkStore.getState().addLink('src', 'existing', 'E', 0);
      useWikiLinkStore.getState().removeLink('src', 'nonexistent');

      expect(useWikiLinkStore.getState().links).toHaveLength(1);
    });
  });

  describe('getBacklinks', () => {
    it('returns all links that point to a given target', () => {
      useWikiLinkStore.getState().addLink('page1', 'targetPage', 'T', 0);
      useWikiLinkStore.getState().addLink('page2', 'targetPage', 'T', 5);
      useWikiLinkStore.getState().addLink('page3', 'otherPage', 'O', 0);

      const backlinks = useWikiLinkStore.getState().getBacklinks('targetPage');
      expect(backlinks).toHaveLength(2);
      expect(backlinks[0].source).toBe('page1');
      expect(backlinks[1].source).toBe('page2');
    });

    it('returns empty array when no backlinks exist', () => {
      const backlinks = useWikiLinkStore.getState().getBacklinks('unknown');
      expect(backlinks).toEqual([]);
    });
  });

  describe('getForwardlinks', () => {
    it('returns all links originating from a given source', () => {
      useWikiLinkStore.getState().addLink('sourcePage', 'target1', 'T1', 0);
      useWikiLinkStore.getState().addLink('sourcePage', 'target2', 'T2', 10);
      useWikiLinkStore.getState().addLink('otherPage', 'target3', 'T3', 0);

      const forwardlinks = useWikiLinkStore.getState().getForwardlinks('sourcePage');
      expect(forwardlinks).toHaveLength(2);
      expect(forwardlinks[0].target).toBe('target1');
      expect(forwardlinks[1].target).toBe('target2');
    });

    it('returns empty array when no forward links exist', () => {
      const forwardlinks = useWikiLinkStore.getState().getForwardlinks('unknown');
      expect(forwardlinks).toEqual([]);
    });
  });

  describe('setCurrentPage', () => {
    it('updates the current page', () => {
      useWikiLinkStore.getState().setCurrentPage('myPage');
      expect(useWikiLinkStore.getState().currentPage).toBe('myPage');
    });

    it('can be set to a different page', () => {
      useWikiLinkStore.getState().setCurrentPage('first');
      useWikiLinkStore.getState().setCurrentPage('second');
      expect(useWikiLinkStore.getState().currentPage).toBe('second');
    });
  });

  describe('clearLinks', () => {
    it('removes all links from the store', () => {
      useWikiLinkStore.getState().addLink('a', 'b', 'B', 0);
      useWikiLinkStore.getState().addLink('c', 'd', 'D', 0);

      useWikiLinkStore.getState().clearLinks();

      expect(useWikiLinkStore.getState().links).toHaveLength(0);
    });

    it('does not affect currentPage', () => {
      useWikiLinkStore.getState().setCurrentPage('keepMe');
      useWikiLinkStore.getState().addLink('a', 'b', 'B', 0);
      useWikiLinkStore.getState().clearLinks();

      expect(useWikiLinkStore.getState().currentPage).toBe('keepMe');
    });
  });

  describe('parseLinksFromContent', () => {
    it('parses simple [[target]] wiki links', () => {
      const links: WikiLinkInfo[] =
        useWikiLinkStore.getState().parseLinksFromContent(
          'See [[other-page]] for details.',
          'current-page'
        );

      expect(links).toHaveLength(1);
      expect(links[0].source).toBe('current-page');
      expect(links[0].target).toBe('other-page');
      expect(links[0].display).toBe('other-page');
      expect(links[0].position).toBe(4); // index of '[' in '[[other-page]]'
    });

    it('parses [[target|display]] links with alias', () => {
      const links: WikiLinkInfo[] =
        useWikiLinkStore.getState().parseLinksFromContent(
          'Click [[my-page|here]] now.',
          'src'
        );

      expect(links).toHaveLength(1);
      expect(links[0].target).toBe('my-page');
      expect(links[0].display).toBe('here');
    });

    it('parses multiple wiki links in the same content', () => {
      const links: WikiLinkInfo[] =
        useWikiLinkStore.getState().parseLinksFromContent(
          'Ref [[page1]] and [[page2|alias]] and [[page3]].',
          'source'
        );

      expect(links).toHaveLength(3);
      expect(links[0].target).toBe('page1');
      expect(links[1].target).toBe('page2');
      expect(links[1].display).toBe('alias');
      expect(links[2].target).toBe('page3');
    });

    it('returns empty array for content with no wiki links', () => {
      const links: WikiLinkInfo[] =
        useWikiLinkStore.getState().parseLinksFromContent(
          'Plain text with [markdown link](url) only.',
          'src'
        );

      expect(links).toEqual([]);
    });

    it('trims whitespace from target and display', () => {
      const links: WikiLinkInfo[] =
        useWikiLinkStore.getState().parseLinksFromContent(
          'Link: [[ target-page | nice display ]]',
          'src'
        );

      expect(links).toHaveLength(1);
      expect(links[0].target).toBe('target-page');
      expect(links[0].display).toBe('nice display');
    });

    it('handles wiki link with pipe but empty display', () => {
      const links: WikiLinkInfo[] =
        useWikiLinkStore.getState().parseLinksFromContent(
          'Link: [[target|]]',
          'src'
        );

      expect(links).toHaveLength(1);
      expect(links[0].target).toBe('target');
      // Empty string after pipe => display falls back to target
      expect(links[0].display).toBe('target');
    });
  });
});
