import React, { useState, useRef, useEffect } from 'react';
import {
  Bold, Italic, List, CheckSquare, Code, Image as ImageIcon,
  Eye, Edit3, AtSign, Loader2
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { User } from '../types';

interface MarkdownEditorWithPasteProps {
  value: string;
  onChange: (val: string) => void;
  entityType?: 'TASK' | 'RFI' | 'COMMENT';
  entityId?: string;
  placeholder?: string;
  minHeight?: string;
  onMentionAdded?: (userId: string) => void;
}

export const MarkdownEditorWithPaste: React.FC<MarkdownEditorWithPasteProps> = ({
  value,
  onChange,
  entityType = 'TASK',
  entityId = 'temp',
  placeholder = 'SPECIFY DETAILS (SUPPORTS MARKDOWN, CTRL+V SCREENSHOT PASTE, @MENTIONS)...',
  minHeight = '180px',
  onMentionAdded
}) => {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  
  // @Mention popup state
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [users] = useState<User[]>(apiService.getUsers());

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = event.clipboardData;
    if (!clipboardData || !clipboardData.items) return;

    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.type.indexOf('image') !== -1) {
        event.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          await uploadAndInsertImage(blob, 'pasted_screenshot_' + new Date().toISOString().slice(0, 10) + '.png');
        }
        break;
      }
    }
  };

  const uploadAndInsertImage = async (file: File | Blob, customName?: string) => {
    setIsUploading(true);
    setUploadProgress(20);
    setUploadStatusText('REQUESTING S3 PRE-SIGNED URL...');

    try {
      const fileName = customName || (file instanceof File ? file.name : 'image_' + Date.now() + '.png');
      const mimeType = file.type || 'image/png';
      const targetEntityType = (entityType || 'TASK') as 'TASK' | 'RFI' | 'COMMENT';

      const presigned = await apiService.getPresignedUrl(fileName, mimeType, targetEntityType, entityId);
      
      setUploadProgress(60);
      setUploadStatusText('S3 STREAMING (PUT /storage)...');

      let previewUrl = presigned.fileUrl;
      if (typeof window !== 'undefined' && window.URL && file instanceof Blob) {
        try {
          previewUrl = URL.createObjectURL(file);
        } catch (e) {}
      }

      await new Promise(r => setTimeout(r, 400));
      setUploadProgress(95);

      apiService.completeAttachment({
        id: presigned.attachmentId,
        entityType: targetEntityType,
        entityId,
        fileName,
        fileSize: file.size,
        mimeType,
        storageKey: presigned.storageKey,
        fileUrl: previewUrl,
        uploaderId: apiService.getCurrentUser().id,
        uploaderName: apiService.getCurrentUser().name,
        createdAt: new Date().toISOString()
      });

      setUploadProgress(100);

      const textarea = textareaRef.current;
      const mdSnippet = `\n\n![${fileName}](${previewUrl})\n`;

      if (textarea) {
        const start = textarea.selectionStart || value.length;
        const end = textarea.selectionEnd || value.length;
        const nextValue = value.substring(0, start) + mdSnippet + value.substring(end);
        onChange(nextValue);

        setTimeout(() => {
          textarea.focus();
          const newPos = start + mdSnippet.length;
          textarea.setSelectionRange(newPos, newPos);
        }, 50);
      } else {
        onChange(value + mdSnippet);
      }
    } catch (err) {
      console.error('Upload failed', err);
      alert('UPLOAD FAILED');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatusText('');
      }, 500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionMenu && (e.key === 'Escape' || e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
      if (e.key === 'Escape') {
        setShowMentionMenu(false);
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1 && cursor - lastAtIndex <= 15) {
      const query = textBeforeCursor.substring(lastAtIndex + 1);
      if (!query.includes(' ') && !query.includes('\n')) {
        setMentionQuery(query.toLowerCase());
        setShowMentionMenu(true);
        return;
      }
    }
    setShowMentionMenu(false);
  };

  const handleSelectMention = (user: User) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const mentionText = `@${user.name} `;
      const nextValue = value.substring(0, lastAtIndex) + mentionText + value.substring(cursor);
      onChange(nextValue);

      if (onMentionAdded) {
        onMentionAdded(user.id);
      }

      setShowMentionMenu(false);
      setTimeout(() => {
        textarea.focus();
        const newCursor = lastAtIndex + mentionText.length;
        textarea.setSelectionRange(newCursor, newCursor);
      }, 50);
    }
  };

  const insertFormatting = (prefix: string, suffix: string = '', defaultPlaceholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || defaultPlaceholder;
    const replacement = `${prefix}${selectedText}${suffix}`;

    const nextValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(nextValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 50);
  };

  const renderMarkdownPreview = (text: string) => {
    if (!text.trim()) {
      return <div className="text-neutral-400 italic py-6 text-center text-xs font-mono">NO CONTENT SPECIFIED</div>;
    }

    const lines = text.split('\n');
    return (
      <div className="space-y-3 text-black text-sm leading-relaxed font-serif">
        {lines.map((line, idx) => {
          const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
          if (imgMatch) {
            return (
              <div key={idx} className="my-3 border-2 border-black p-2 inline-block max-w-full bg-white">
                <img
                  src={imgMatch[2]}
                  alt={imgMatch[1]}
                  className="max-h-72 object-contain grayscale hover:grayscale-0 transition-all duration-100 cursor-pointer"
                  onClick={() => window.open(imgMatch[2], '_blank')}
                />
                <div className="font-mono text-[10px] text-neutral-500 mt-2 flex items-center justify-between border-t border-black pt-1">
                  <span>{imgMatch[1] || 'SCREENSHOT'}</span>
                  <span className="uppercase text-black underline">CLICK TO OPEN</span>
                </div>
              </div>
            );
          }

          if (line.startsWith('### ')) {
            return <h4 key={idx} className="font-display text-base font-bold text-black mt-3 mb-1 uppercase tracking-tight">{line.replace('### ', '')}</h4>;
          }
          if (line.startsWith('## ')) {
            return <h3 key={idx} className="font-display text-lg font-bold text-black mt-4 mb-2 uppercase tracking-tight">{line.replace('## ', '')}</h3>;
          }
          if (line.startsWith('# ')) {
            return <h2 key={idx} className="font-display text-xl font-bold text-black mt-5 mb-2 uppercase tracking-tight">{line.replace('# ', '')}</h2>;
          }

          if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
            const isChecked = line.startsWith('- [x] ');
            return (
              <div key={idx} className="flex items-center space-x-2 text-black font-serif">
                <span className="font-mono">{isChecked ? '[X]' : '[ ]'}</span>
                <span>{line.replace(/- \[[ x]\] /, '')}</span>
              </div>
            );
          }

          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start space-x-2 text-black pl-2 font-serif">
                <span className="font-bold">•</span>
                <span>{line.replace(/^[-*]\s+/, '')}</span>
              </div>
            );
          }

          const numMatch = line.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start space-x-2 text-black pl-2 font-serif">
                <span className="font-mono text-xs">{numMatch[1]}.</span>
                <span>{numMatch[2]}</span>
              </div>
            );
          }

          if (line.startsWith('> ')) {
            return (
              <blockquote key={idx} className="border-l-4 border-black pl-3 py-1 my-2 bg-neutral-100 text-black italic">
                {line.replace('> ', '')}
              </blockquote>
            );
          }

          if (!line.trim()) {
            return <div key={idx} className="h-2"></div>;
          }

          return (
            <p key={idx} className="whitespace-pre-wrap">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(mentionQuery) ||
    u.email.toLowerCase().includes(mentionQuery) ||
    u.title.toLowerCase().includes(mentionQuery)
  );

  return (
    <div className="border-2 border-black bg-white">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-100 border-b-2 border-black text-black select-none font-mono">
        <div className="flex items-center space-x-1">
          <button
            type="button"
            title="Bold"
            onClick={() => insertFormatting('**', '**', 'BOLD TEXT')}
            className="p-1 border border-black hover:bg-black hover:text-white transition-colors duration-100"
          >
            <Bold className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            title="Italic"
            onClick={() => insertFormatting('*', '*', 'ITALIC TEXT')}
            className="p-1 border border-black hover:bg-black hover:text-white transition-colors duration-100"
          >
            <Italic className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
          <div className="w-px h-4 bg-black mx-1"></div>
          <button
            type="button"
            title="Bullet List"
            onClick={() => insertFormatting('- ', '', 'ITEM')}
            className="p-1 border border-black hover:bg-black hover:text-white transition-colors duration-100"
          >
            <List className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            title="Checklist"
            onClick={() => insertFormatting('- [ ] ', '', 'TASK')}
            className="p-1 border border-black hover:bg-black hover:text-white transition-colors duration-100"
          >
            <CheckSquare className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            title="Mention Member"
            onClick={() => {
              insertFormatting('@', '', '');
              setShowMentionMenu(true);
            }}
            className="px-2 py-1 border border-black hover:bg-black hover:text-white transition-colors duration-100 flex items-center space-x-1 text-[11px] uppercase font-bold"
          >
            <AtSign className="w-3.5 h-3.5" strokeWidth={2} />
            <span className="hidden sm:inline">MENTION</span>
          </button>
          <div className="w-px h-4 bg-black mx-1"></div>
          <button
            type="button"
            title="Code / Spec"
            onClick={() => insertFormatting('`', '`', 'SPEC')}
            className="p-1 border border-black hover:bg-black hover:text-white transition-colors duration-100"
          >
            <Code className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
          <label
            title="Upload Image (or press Ctrl+V to paste)"
            className="px-2 py-1 border border-black hover:bg-black hover:text-white transition-colors duration-100 cursor-pointer flex items-center space-x-1 text-[11px] uppercase font-bold text-black"
          >
            <ImageIcon className="w-3.5 h-3.5" strokeWidth={2} />
            <span className="hidden sm:inline">IMAGE</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) uploadAndInsertImage(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center border border-black p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`px-2.5 py-1 uppercase font-bold transition-colors duration-100 flex items-center space-x-1 ${
              activeTab === 'write' ? 'bg-black text-white' : 'text-black hover:bg-neutral-200'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>WRITE</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-2.5 py-1 uppercase font-bold transition-colors duration-100 flex items-center space-x-1 ${
              activeTab === 'preview' ? 'bg-black text-white' : 'text-black hover:bg-neutral-200'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>PREVIEW</span>
          </button>
        </div>
      </div>

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="bg-black text-white px-3 py-2 flex items-center justify-between text-xs font-mono uppercase tracking-wider">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
            <span>{uploadStatusText}</span>
          </div>
          <span className="font-bold">{uploadProgress}%</span>
        </div>
      )}

      {/* Container for textarea and mention popup */}
      <div className="relative p-3">
        {activeTab === 'write' ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            style={{ minHeight }}
            className="w-full resize-y text-sm text-black placeholder:text-neutral-400 focus:outline-none font-serif leading-relaxed"
          />
        ) : (
          <div style={{ minHeight }} className="overflow-y-auto">
            {renderMarkdownPreview(value)}
          </div>
        )}

        {/* Mention Dropdown Menu */}
        {showMentionMenu && (
          <div className="absolute left-6 bottom-10 z-40 bg-white border-2 border-black p-2 w-64 max-h-56 overflow-y-auto font-mono">
            <div className="px-2 py-1 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-black">
              PROJECT TEAM MENTIONS
            </div>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectMention(u)}
                  className="w-full text-left px-2 py-1.5 hover:bg-black hover:text-white flex items-center space-x-2 transition-colors duration-100 group uppercase"
                >
                  <div className="w-5 h-5 bg-black text-white flex items-center justify-center font-bold text-[9px] border border-current group-hover:bg-white group-hover:text-black">
                    {u.name.slice(0, 1)}
                  </div>
                  <div className="truncate text-xs">
                    <div className="font-bold">{u.name}</div>
                    <div className="text-[10px] opacity-70 truncate">{u.title}</div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-2 text-xs text-neutral-400 text-center">NO MATCHING USERS</div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Hint */}
      <div className="px-3 py-1.5 bg-neutral-100 border-t border-black text-[10px] font-mono text-neutral-600 flex items-center justify-between uppercase">
        <div>
          <span className="font-bold border border-black px-1 mr-1">CTRL + V</span>
          <span>PASTE SCREENSHOT TO S3</span>
        </div>
        <div>
          <span>TYPE</span>
          <span className="font-bold text-black mx-1">@</span>
          <span>TO MENTION</span>
        </div>
      </div>
    </div>
  );
};
