'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Check, AlertCircle } from 'lucide-react';

interface SubtitleUploadProps {
  animeId: number;
  episode: number;
  onSuccess?: () => void;
}

export default function SubtitleUpload({ animeId, episode, onSuccess }: SubtitleUploadProps) {
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [language, setLanguage] = useState('en');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validExtensions = ['.vtt', '.srt', '.ass'];
      const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        setError('Invalid file type. Please upload .vtt, .srt, or .ass files');
        return;
      }

      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const content = await file.text();
      const format = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();

      const res = await fetch('/api/subtitles/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animeId,
          episode,
          language,
          content,
          format
        })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setShowModal(false);
          setSuccess(false);
          setFile(null);
          if (onSuccess) onSuccess();
        }, 2000);
      } else {
        const data = await res.json();
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!session) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 glass rounded-xl hover:bg-white/10 transition-all text-sm"
      >
        <Upload size={16} />
        Upload Subtitle
      </button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Upload Subtitle</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {success ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <Check className="text-green-500" size={32} />
                  </div>
                  <p className="text-lg font-bold">Upload Successful!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neonCyan"
                    >
                      <option value="en">English</option>
                      <option value="ja">Japanese</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">Subtitle File</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".vtt,.srt,.ass"
                        onChange={handleFileChange}
                        className="hidden"
                        id="subtitle-file"
                      />
                      <label
                        htmlFor="subtitle-file"
                        className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-white/20 rounded-xl hover:border-neonCyan transition-all cursor-pointer"
                      >
                        <Upload size={20} />
                        {file ? file.name : 'Choose file (.vtt, .srt, .ass)'}
                      </label>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleUpload}
                      disabled={uploading || !file}
                      className="flex-1 py-3 bg-neonCyan text-black rounded-xl font-bold hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-6 py-3 glass rounded-xl hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                  </div>

                  <p className="text-xs text-white/40 text-center">
                    Supported formats: VTT, SRT, ASS
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
