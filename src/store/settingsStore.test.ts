import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../store/settingsStore';

describe('useSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({
      theme: 'light',
      indentSize: 2,
      lineEnding: 'lf',
      exportFolder: 'auto',
      exportCustomPath: '',
      defaultCodeLanguage: '',
      imageInsertBehavior: 'copy',
      imageFolder: '',
      enableDiagrams: true,
      enableMath: true,
      enableFootnotes: true,
      enableYaml: true,
      enableAutoLinks: true,
      reopenLastFiles: true,
      smartPaste: true,
      autoMatchBrackets: true,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 14,
      showLineNumber: true,
      spellCheck: false,
      spellCheckLanguage: 'en-US',
      autoSave: true,
      autoSaveInterval: 30000,
      focusMode: false,
      typewriterMode: false,
      showWordCount: true,
    });
  });

  describe('initial defaults', () => {
    it('has light theme by default', () => {
      expect(useSettingsStore.getState().theme).toBe('light');
    });

    it('has indentSize of 2', () => {
      expect(useSettingsStore.getState().indentSize).toBe(2);
    });

    it('has lf line ending by default', () => {
      expect(useSettingsStore.getState().lineEnding).toBe('lf');
    });

    it('has auto export folder', () => {
      expect(useSettingsStore.getState().exportFolder).toBe('auto');
    });

    it('has empty exportCustomPath', () => {
      expect(useSettingsStore.getState().exportCustomPath).toBe('');
    });

    it('has empty defaultCodeLanguage', () => {
      expect(useSettingsStore.getState().defaultCodeLanguage).toBe('');
    });

    it('has copy image insert behavior', () => {
      expect(useSettingsStore.getState().imageInsertBehavior).toBe('copy');
    });

    it('has empty imageFolder', () => {
      expect(useSettingsStore.getState().imageFolder).toBe('');
    });

    it('has all feature flags enabled by default', () => {
      const state = useSettingsStore.getState();
      expect(state.enableDiagrams).toBe(true);
      expect(state.enableMath).toBe(true);
      expect(state.enableFootnotes).toBe(true);
      expect(state.enableYaml).toBe(true);
      expect(state.enableAutoLinks).toBe(true);
      expect(state.reopenLastFiles).toBe(true);
      expect(state.smartPaste).toBe(true);
      expect(state.autoMatchBrackets).toBe(true);
    });

    it('has default system font family', () => {
      expect(useSettingsStore.getState().fontFamily).toContain('-apple-system');
    });

    it('has fontSize 14', () => {
      expect(useSettingsStore.getState().fontSize).toBe(14);
    });

    it('has showLineNumber enabled by default', () => {
      expect(useSettingsStore.getState().showLineNumber).toBe(true);
    });

    it('has spellCheck disabled by default', () => {
      expect(useSettingsStore.getState().spellCheck).toBe(false);
    });

    it('has en-US spell check language', () => {
      expect(useSettingsStore.getState().spellCheckLanguage).toBe('en-US');
    });

    it('has autoSave enabled by default', () => {
      expect(useSettingsStore.getState().autoSave).toBe(true);
    });

    it('has autoSaveInterval of 30000ms', () => {
      expect(useSettingsStore.getState().autoSaveInterval).toBe(30000);
    });

    it('has focusMode disabled by default', () => {
      expect(useSettingsStore.getState().focusMode).toBe(false);
    });

    it('has typewriterMode disabled by default', () => {
      expect(useSettingsStore.getState().typewriterMode).toBe(false);
    });

    it('has showWordCount enabled by default', () => {
      expect(useSettingsStore.getState().showWordCount).toBe(true);
    });
  });

  describe('persist key', () => {
    it('uses markhere-settings as persist key', () => {
      const { setTheme } = useSettingsStore.getState();
      setTheme('dark');

      // The persist middleware writes to localStorage under the configured name
      const stored = localStorage.getItem('markhere-settings');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.theme).toBe('dark');
    });
  });

  describe('setTheme', () => {
    it('sets theme to dark', () => {
      useSettingsStore.getState().setTheme('dark');
      expect(useSettingsStore.getState().theme).toBe('dark');
    });

    it('sets theme to sepia', () => {
      useSettingsStore.getState().setTheme('sepia');
      expect(useSettingsStore.getState().theme).toBe('sepia');
    });

    it('updates and reads back correctly', () => {
      const { setTheme } = useSettingsStore.getState();
      setTheme('dark');
      expect(useSettingsStore.getState().theme).toBe('dark');
      setTheme('light');
      expect(useSettingsStore.getState().theme).toBe('light');
    });
  });

  describe('setIndentSize', () => {
    it('updates indent size', () => {
      useSettingsStore.getState().setIndentSize(4);
      expect(useSettingsStore.getState().indentSize).toBe(4);
    });
  });

  describe('setLineEnding', () => {
    it('updates line ending to crlf', () => {
      useSettingsStore.getState().setLineEnding('crlf');
      expect(useSettingsStore.getState().lineEnding).toBe('crlf');
    });
  });

  describe('setExportFolder', () => {
    it('updates export folder setting', () => {
      useSettingsStore.getState().setExportFolder('custom');
      expect(useSettingsStore.getState().exportFolder).toBe('custom');
    });
  });

  describe('setExportCustomPath', () => {
    it('updates custom export path', () => {
      useSettingsStore.getState().setExportCustomPath('/Users/test/exports');
      expect(useSettingsStore.getState().exportCustomPath).toBe('/Users/test/exports');
    });
  });

  describe('setDefaultCodeLanguage', () => {
    it('updates default code language', () => {
      useSettingsStore.getState().setDefaultCodeLanguage('typescript');
      expect(useSettingsStore.getState().defaultCodeLanguage).toBe('typescript');
    });
  });

  describe('setImageInsertBehavior', () => {
    it('updates image insert behavior to link', () => {
      useSettingsStore.getState().setImageInsertBehavior('link');
      expect(useSettingsStore.getState().imageInsertBehavior).toBe('link');
    });

    it('updates image insert behavior to upload', () => {
      useSettingsStore.getState().setImageInsertBehavior('upload');
      expect(useSettingsStore.getState().imageInsertBehavior).toBe('upload');
    });
  });

  describe('setImageFolder', () => {
    it('updates image folder path', () => {
      useSettingsStore.getState().setImageFolder('assets/img');
      expect(useSettingsStore.getState().imageFolder).toBe('assets/img');
    });
  });

  describe('setEnableDiagrams', () => {
    it('toggles diagrams to false', () => {
      useSettingsStore.getState().setEnableDiagrams(false);
      expect(useSettingsStore.getState().enableDiagrams).toBe(false);
    });
  });

  describe('setEnableMath', () => {
    it('toggles math to false', () => {
      useSettingsStore.getState().setEnableMath(false);
      expect(useSettingsStore.getState().enableMath).toBe(false);
    });
  });

  describe('setEnableFootnotes', () => {
    it('toggles footnotes to false', () => {
      useSettingsStore.getState().setEnableFootnotes(false);
      expect(useSettingsStore.getState().enableFootnotes).toBe(false);
    });
  });

  describe('setEnableYaml', () => {
    it('toggles yaml to false', () => {
      useSettingsStore.getState().setEnableYaml(false);
      expect(useSettingsStore.getState().enableYaml).toBe(false);
    });
  });

  describe('setEnableAutoLinks', () => {
    it('toggles auto links to false', () => {
      useSettingsStore.getState().setEnableAutoLinks(false);
      expect(useSettingsStore.getState().enableAutoLinks).toBe(false);
    });
  });

  describe('setReopenLastFiles', () => {
    it('toggles reopen last files to false', () => {
      useSettingsStore.getState().setReopenLastFiles(false);
      expect(useSettingsStore.getState().reopenLastFiles).toBe(false);
    });
  });

  describe('setSmartPaste', () => {
    it('toggles smart paste to false', () => {
      useSettingsStore.getState().setSmartPaste(false);
      expect(useSettingsStore.getState().smartPaste).toBe(false);
    });
  });

  describe('setAutoMatchBrackets', () => {
    it('toggles auto match brackets to false', () => {
      useSettingsStore.getState().setAutoMatchBrackets(false);
      expect(useSettingsStore.getState().autoMatchBrackets).toBe(false);
    });
  });

  describe('setFontFamily', () => {
    it('updates font family', () => {
      useSettingsStore.getState().setFontFamily('"Fira Code", monospace');
      expect(useSettingsStore.getState().fontFamily).toBe('"Fira Code", monospace');
    });
  });

  describe('setFontSize', () => {
    it('updates font size', () => {
      useSettingsStore.getState().setFontSize(18);
      expect(useSettingsStore.getState().fontSize).toBe(18);
    });
  });

  describe('setShowLineNumber', () => {
    it('toggles line numbers off', () => {
      useSettingsStore.getState().setShowLineNumber(false);
      expect(useSettingsStore.getState().showLineNumber).toBe(false);
    });
  });

  describe('setSpellCheck', () => {
    it('enables spell check', () => {
      useSettingsStore.getState().setSpellCheck(true);
      expect(useSettingsStore.getState().spellCheck).toBe(true);
    });
  });

  describe('setSpellCheckLanguage', () => {
    it('updates spell check language', () => {
      useSettingsStore.getState().setSpellCheckLanguage('fr-FR');
      expect(useSettingsStore.getState().spellCheckLanguage).toBe('fr-FR');
    });
  });

  describe('setAutoSave', () => {
    it('disables auto save', () => {
      useSettingsStore.getState().setAutoSave(false);
      expect(useSettingsStore.getState().autoSave).toBe(false);
    });
  });

  describe('setAutoSaveInterval', () => {
    it('updates auto save interval', () => {
      useSettingsStore.getState().setAutoSaveInterval(60000);
      expect(useSettingsStore.getState().autoSaveInterval).toBe(60000);
    });

    it('accepts short intervals', () => {
      useSettingsStore.getState().setAutoSaveInterval(5000);
      expect(useSettingsStore.getState().autoSaveInterval).toBe(5000);
    });
  });

  describe('setFocusMode', () => {
    it('enables focus mode', () => {
      useSettingsStore.getState().setFocusMode(true);
      expect(useSettingsStore.getState().focusMode).toBe(true);
    });
  });

  describe('setTypewriterMode', () => {
    it('enables typewriter mode', () => {
      useSettingsStore.getState().setTypewriterMode(true);
      expect(useSettingsStore.getState().typewriterMode).toBe(true);
    });
  });

  describe('setShowWordCount', () => {
    it('hides word count', () => {
      useSettingsStore.getState().setShowWordCount(false);
      expect(useSettingsStore.getState().showWordCount).toBe(false);
    });
  });
});
