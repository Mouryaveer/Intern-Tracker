'use client';

import React, { useRef, useState } from 'react';
import { X, Upload, Trash2, Camera } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { updateUser } from '@/lib/data-service';
import Avatar from './Avatar';

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(user?.avatar_url || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB.');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setSaving(true);
    const updated = updateUser(user.id, { avatar_url: preview });
    if (updated) {
      setUser(updated);
      localStorage.setItem('current_user', JSON.stringify(updated));
    }
    setSaving(false);
    onClose();
  };

  const handleRemove = () => {
    setPreview('');
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

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-sm)', width: '100%' }}>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
              JPG, PNG or GIF · Max 2MB
            </p>

            <button className="btn btn-outline w-full" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} /> Upload Photo
            </button>

            {preview && (
              <button className="btn btn-ghost w-full" style={{ color: 'var(--color-blocked)' }} onClick={handleRemove}>
                <Trash2 size={16} /> Remove Photo
              </button>
            )}

            {error && (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-blocked)' }}>{error}</p>
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
          <button className="btn btn-accent" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
