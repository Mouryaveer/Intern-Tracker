'use client';

import React, { useRef, useState } from 'react';
import { X, Upload, Trash2, Camera } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { updateUser } from '@/lib/data-service';
import Avatar from './Avatar';

// Compress + resize image to max 300x300, quality 0.8 → keeps base64 small
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 300;
        let { width, height } = img;
        if (width > height) {
          if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
        } else {
          if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(user?.avatar_url || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, GIF).');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const compressed = await compressImage(file);
      setPreview(compressed);
    } catch {
      setError('Could not process image. Please try a different file.');
    } finally {
      setLoading(false);
      // Reset input so same file can be re-selected
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await updateUser(user.id, { avatar_url: preview });
      if (updated) {
        setUser(updated);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile photo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Your Profile Photo</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-xl)' }}>
          {/* Preview */}
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <Avatar name={user.name} avatarUrl={preview} size="lg" style={{ width: 96, height: 96, fontSize: 28 }} />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--color-accent)', border: '2px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff',
              }}
              title="Change photo"
            >
              <Camera size={14} />
            </button>
          </div>

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              <span className="spinner" style={{ width: 16, height: 16 }} /> Processing image...
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-sm)', width: '100%' }}>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
              Any image — auto-resized &amp; compressed for you
            </p>

            <button className="btn btn-outline w-full" onClick={() => fileInputRef.current?.click()} disabled={loading}>
              <Upload size={16} /> {preview ? 'Change Photo' : 'Upload Photo'}
            </button>

            {preview && (
              <button
                className="btn btn-ghost w-full"
                style={{ color: 'var(--color-blocked)' }}
                onClick={() => setPreview('')}
              >
                <Trash2 size={16} /> Remove Photo
              </button>
            )}

            {error && (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-blocked)', textAlign: 'center' }}>{error}</p>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
