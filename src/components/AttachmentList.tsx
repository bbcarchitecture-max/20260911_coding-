import React, { useState } from 'react';
import {
  Paperclip, FileText, Image as ImageIcon, FileArchive, FileCode,
  Download, Trash2, UploadCloud, Eye
} from 'lucide-react';
import { Attachment } from '../types';
import { apiService } from '../services/apiService';

interface AttachmentListProps {
  entityType: 'TASK' | 'RFI' | 'COMMENT';
  entityId: string;
  onPreviewImage: (imageUrl: string, fileName: string) => void;
  canEdit?: boolean;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_EXTENSIONS = ['dwg', 'dxf', 'pdf', 'png', 'jpg', 'jpeg', 'webp', 'zip', 'rar', '7z', 'docx', 'xlsx', 'pptx', 'txt'];

export const AttachmentList: React.FC<AttachmentListProps> = ({
  entityType,
  entityId,
  onPreviewImage,
  canEdit = true
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>(apiService.getAttachments(entityType, entityId));
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName: string, mimeType: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (mimeType.includes('image') || ['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
      return <ImageIcon className="w-4 h-4 text-black" strokeWidth={1.5} />;
    }
    if (ext === 'dwg' || ext === 'dxf') {
      return <FileCode className="w-4 h-4 text-black" strokeWidth={1.5} />;
    }
    if (ext === 'pdf') {
      return <FileText className="w-4 h-4 text-black" strokeWidth={1.5} />;
    }
    if (['zip', 'rar', '7z'].includes(ext || '')) {
      return <FileArchive className="w-4 h-4 text-black" strokeWidth={1.5} />;
    }
    return <FileText className="w-4 h-4 text-black" strokeWidth={1.5} />;
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploadSuccess(null);

    const currentUser = apiService.getCurrentUser();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`FILE "${file.name}" EXCEEDS 50MB LIMIT (${formatFileSize(file.size)}).`);
        return;
      }

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setUploadError(`UNSUPPORTED EXTENSION ".${ext}". ALLOWED: CAD, PDF, IMAGES, OFFICE, ZIP.`);
        return;
      }

      try {
        const presigned = await apiService.getPresignedUrl(file.name, file.type, entityType, entityId);

        let previewUrl = presigned.fileUrl;
        if (typeof window !== 'undefined' && window.URL && file.type.includes('image')) {
          try {
            previewUrl = URL.createObjectURL(file);
          } catch (e) {}
        }

        const newAttachment: Attachment = {
          id: presigned.attachmentId,
          entityType,
          entityId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          storageKey: presigned.storageKey,
          fileUrl: previewUrl,
          uploaderId: currentUser.id,
          uploaderName: currentUser.name,
          createdAt: new Date().toISOString()
        };

        apiService.completeAttachment(newAttachment);
        setAttachments(apiService.getAttachments(entityType, entityId));
        setUploadSuccess(`UPLOAD COMPLETED: ${file.name} (S3 BUCKET)`);
      } catch (err) {
        setUploadError(`UPLOAD FAILED FOR "${file.name}".`);
      }
    }
  };

  const handleDelete = (attachmentId: string) => {
    if (confirm('REMOVE THIS ATTACHMENT?')) {
      apiService.deleteAttachment(attachmentId);
      setAttachments(apiService.getAttachments(entityType, entityId));
    }
  };

  const isImage = (mimeType: string, fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return mimeType.includes('image') || ['png', 'jpg', 'jpeg', 'webp'].includes(ext || '');
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Upload Zone */}
      {canEdit && (
        <div
          onDragOver={e => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => {
            e.preventDefault();
            setIsDragging(false);
            handleFileUpload(e.dataTransfer.files);
          }}
          className={`border-2 border-dashed p-5 text-center transition-all duration-100 ${
            isDragging
              ? 'border-black bg-neutral-100'
              : 'border-black bg-white hover:bg-neutral-50'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-9 h-9 border-2 border-black flex items-center justify-center bg-black text-white">
              <UploadCloud className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-black cursor-pointer hover:underline">
                <span>CLICK TO SELECT</span>
                <input
                  type="file"
                  multiple
                  onChange={e => handleFileUpload(e.target.files)}
                  className="hidden"
                />
              </label>
              <span className="text-neutral-500"> OR DRAG & DROP CAD / PDF / IMAGES HERE</span>
            </div>
            <p className="text-[10px] text-neutral-500 uppercase">
              S3 DIRECT PRE-SIGNED PUT UPLOAD // 50MB MAX PER FILE
            </p>
          </div>
        </div>
      )}

      {/* Notifications */}
      {uploadError && (
        <div className="border-2 border-black bg-black text-white p-2.5 text-xs uppercase tracking-wider">
          ERROR: {uploadError}
        </div>
      )}

      {uploadSuccess && (
        <div className="border-2 border-black bg-neutral-100 text-black p-2.5 text-xs font-bold uppercase tracking-wider">
          STATUS 200: {uploadSuccess}
        </div>
      )}

      {/* Attachment List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-1 border-b border-black">
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            ATTACHED ASSETS ({attachments.length})
          </span>
          <span className="text-[10px] text-neutral-500 uppercase">PRE-SIGNED URL SECURED</span>
        </div>

        {attachments.length === 0 ? (
          <div className="py-6 text-center text-neutral-400 border border-neutral-200">
            NO ATTACHMENTS LINKED
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 border-2 border-black">
            {attachments.map(att => {
              const isImg = isImage(att.mimeType, att.fileName);

              return (
                <div
                  key={att.id}
                  className="p-3 bg-white hover:bg-neutral-50 flex items-center justify-between gap-3 transition-colors duration-100"
                >
                  <div className="flex items-center space-x-3 truncate flex-1">
                    {/* Thumbnail Preview */}
                    {isImg ? (
                      <div
                        onClick={() => onPreviewImage(att.fileUrl, att.fileName)}
                        className="w-10 h-10 border border-black overflow-hidden shrink-0 cursor-pointer grayscale hover:grayscale-0"
                      >
                        <img src={att.fileUrl} alt={att.fileName} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 border border-black flex items-center justify-center shrink-0 bg-neutral-100">
                        {getFileIcon(att.fileName, att.mimeType)}
                      </div>
                    )}

                    <div className="truncate">
                      <div className="font-bold text-black truncate flex items-center space-x-2">
                        <span className="truncate">{att.fileName}</span>
                      </div>
                      <div className="text-[10px] text-neutral-500 flex items-center space-x-2 mt-0.5">
                        <span>{formatFileSize(att.fileSize)}</span>
                        <span>•</span>
                        <span>BY {att.uploaderName.toUpperCase()}</span>
                        <span>•</span>
                        <span>{new Date(att.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {isImg && (
                      <button
                        type="button"
                        onClick={() => onPreviewImage(att.fileUrl, att.fileName)}
                        className="px-2 py-1 border border-black hover:bg-black hover:text-white uppercase text-[10px] font-bold transition-colors duration-100"
                      >
                        PREVIEW
                      </button>
                    )}

                    <a
                      href={att.fileUrl}
                      download={att.fileName}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 border border-black hover:bg-black hover:text-white transition-colors duration-100"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </a>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleDelete(att.id)}
                        className="p-1 border border-black hover:bg-black hover:text-white transition-colors duration-100"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
