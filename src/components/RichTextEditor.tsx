import React, { useRef, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Link as LinkIcon,
  RemoveFormatting,
  Code2,
  Eye,
  Undo2,
  Redo2,
  Check,
  X
} from 'lucide-react';

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  id,
  value,
  onChange,
  placeholder = 'Type rich lesson content, guidelines, bullet lists, or code examples...',
  minHeight = '150px',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [showLinkPrompt, setShowLinkPrompt] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const savedRangeRef = useRef<Range | null>(null);

  const [activeFormats, setActiveFormats] = useState<{
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikeThrough: boolean;
    unorderedList: boolean;
    orderedList: boolean;
  }>({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    unorderedList: false,
    orderedList: false,
  });

  // Sync value from props when not focused or when switched modes
  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value, isSourceMode]);

  const updateFormatState = () => {
    if (!editorRef.current) return;
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        unorderedList: document.queryCommandState('insertUnorderedList'),
        orderedList: document.queryCommandState('insertOrderedList'),
      });
    } catch {
      // Ignored
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      updateFormatState();
    }
  };

  const executeCommand = (command: string, arg?: string) => {
    if (isSourceMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
    }

    // Special handling for lists to guarantee creation even if selection is empty
    if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !editorRef.current?.contains(selection.anchorNode)) {
        editorRef.current?.focus();
      }
      document.execCommand(command, false, arg);
      handleInput();
      return;
    }

    document.execCommand(command, false, arg);
    handleInput();
  };

  const handleOpenLinkModal = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isSourceMode) return;

    // Save current user selection before opening link toolbar
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    } else {
      savedRangeRef.current = null;
    }

    setLinkUrl('https://');
    setShowLinkPrompt(true);
  };

  const handleApplyLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl || linkUrl.trim() === 'https://' || linkUrl.trim() === '') {
      setShowLinkPrompt(false);
      return;
    }

    const cleanUrl = linkUrl.trim();
    if (editorRef.current) {
      editorRef.current.focus();
    }

    const sel = window.getSelection();
    if (savedRangeRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);

      if (savedRangeRef.current.collapsed) {
        // No text was selected: insert anchor with URL text
        const a = document.createElement('a');
        a.href = cleanUrl;
        a.textContent = cleanUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'text-blue-600 underline font-medium hover:text-blue-800';
        savedRangeRef.current.insertNode(a);

        // Position caret after link
        savedRangeRef.current.setStartAfter(a);
        savedRangeRef.current.setEndAfter(a);
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      } else {
        // Text was selected: apply createLink command
        document.execCommand('createLink', false, cleanUrl);
      }
    } else {
      // Fallback: append link directly to editor
      if (editorRef.current) {
        const a = document.createElement('a');
        a.href = cleanUrl;
        a.textContent = cleanUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'text-blue-600 underline font-medium hover:text-blue-800';
        editorRef.current.appendChild(a);
      }
    }

    handleInput();
    setShowLinkPrompt(false);
  };

  const handleInsertHeading = (tag: 'h1' | 'h2' | 'h3' | 'p') => {
    executeCommand('formatBlock', tag);
  };

  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600 transition-all">
      {/* RCE Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-1.5 flex flex-wrap items-center gap-1 text-slate-700 select-none">
        {/* Undo / Redo */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('undo')}
          className="p-1.5 hover:bg-slate-200/80 rounded text-slate-600 hover:text-slate-900 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('redo')}
          className="p-1.5 hover:bg-slate-200/80 rounded text-slate-600 hover:text-slate-900 transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        {/* Headings */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleInsertHeading('h2')}
          className="p-1.5 hover:bg-slate-200/80 rounded text-slate-600 hover:text-slate-900 transition-colors"
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleInsertHeading('h3')}
          className="p-1.5 hover:bg-slate-200/80 rounded text-slate-600 hover:text-slate-900 transition-colors"
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        {/* Text styling */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('bold')}
          className={`p-1.5 rounded transition-colors ${
            activeFormats.bold
              ? 'bg-blue-100 text-blue-700 font-bold'
              : 'hover:bg-slate-200/80 text-slate-600 hover:text-slate-900'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('italic')}
          className={`p-1.5 rounded transition-colors ${
            activeFormats.italic
              ? 'bg-blue-100 text-blue-700'
              : 'hover:bg-slate-200/80 text-slate-600 hover:text-slate-900'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('underline')}
          className={`p-1.5 rounded transition-colors ${
            activeFormats.underline
              ? 'bg-blue-100 text-blue-700'
              : 'hover:bg-slate-200/80 text-slate-600 hover:text-slate-900'
          }`}
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('strikeThrough')}
          className={`p-1.5 rounded transition-colors ${
            activeFormats.strikeThrough
              ? 'bg-blue-100 text-blue-700'
              : 'hover:bg-slate-200/80 text-slate-600 hover:text-slate-900'
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        {/* Unordered List (Bullets) */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('insertUnorderedList')}
          className={`p-1.5 rounded transition-colors ${
            activeFormats.unorderedList
              ? 'bg-blue-100 text-blue-700 font-bold'
              : 'hover:bg-slate-200/80 text-slate-600 hover:text-slate-900'
          }`}
          title="Bullet List (Unordered List)"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        {/* Ordered List (Numbered) */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('insertOrderedList')}
          className={`p-1.5 rounded transition-colors ${
            activeFormats.orderedList
              ? 'bg-blue-100 text-blue-700 font-bold'
              : 'hover:bg-slate-200/80 text-slate-600 hover:text-slate-900'
          }`}
          title="Numbered List (Ordered List)"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        {/* Blockquote & Code */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('formatBlock', 'blockquote')}
          className="p-1.5 hover:bg-slate-200/80 rounded text-slate-600 hover:text-slate-900 transition-colors"
          title="Quote Block"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('formatBlock', 'pre')}
          className="p-1.5 hover:bg-slate-200/80 rounded text-slate-600 hover:text-slate-900 transition-colors font-mono"
          title="Code Block"
        >
          <Code className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        {/* Link */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleOpenLinkModal}
          className={`p-1.5 rounded transition-colors ${
            showLinkPrompt
              ? 'bg-blue-600 text-white'
              : 'hover:bg-slate-200/80 text-slate-600 hover:text-slate-900'
          }`}
          title="Insert Link"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </button>

        {/* Clear formatting */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('removeFormat')}
          className="p-1.5 hover:bg-slate-200/80 rounded text-slate-600 hover:text-slate-900 transition-colors"
          title="Clear Formatting"
        >
          <RemoveFormatting className="w-3.5 h-3.5" />
        </button>

        {/* Source HTML Mode Switcher */}
        <div className="ml-auto flex items-center">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsSourceMode(!isSourceMode)}
            className={`px-2 py-1 text-[11px] font-semibold rounded flex items-center space-x-1 transition-colors ${
              isSourceMode
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
            title={isSourceMode ? 'Switch to Visual RCE Editor' : 'Edit Raw HTML'}
          >
            {isSourceMode ? (
              <>
                <Eye className="w-3 h-3" />
                <span>Visual</span>
              </>
            ) : (
              <>
                <Code2 className="w-3 h-3" />
                <span>HTML</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Inline Link Prompt Bar */}
      {showLinkPrompt && (
        <form
          onSubmit={handleApplyLink}
          className="bg-blue-50 border-b border-blue-200 px-3 py-2 flex items-center gap-2 text-xs"
        >
          <span className="font-semibold text-blue-900 whitespace-nowrap">URL:</span>
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            autoFocus
            className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center space-x-1 shadow-2xs"
          >
            <Check className="w-3 h-3" />
            <span>Apply</span>
          </button>
          <button
            type="button"
            onClick={() => setShowLinkPrompt(false)}
            className="px-2 py-1 text-slate-600 hover:text-slate-900 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </form>
      )}

      {/* Editor Content Area */}
      {isSourceMode ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Edit raw HTML content..."
          style={{ minHeight }}
          className="w-full p-3 font-mono text-xs text-slate-100 bg-slate-900 focus:outline-none resize-y leading-relaxed"
        />
      ) : (
        <div
          id={id}
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyUp={updateFormatState}
          onMouseUp={updateFormatState}
          style={{ minHeight }}
          data-placeholder={placeholder}
          className="p-3 text-xs sm:text-sm text-slate-900 focus:outline-none overflow-y-auto rce-content empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
        />
      )}
    </div>
  );
};
