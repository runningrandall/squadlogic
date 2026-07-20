'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface BrandingConfig {
  configured: boolean;
  teamDisplayName?: string;
  primaryColor: string;
  tertiaryColor: string;
  logoUrl: string | null;
}

function ColorWheel({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (color: string) => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700 w-32">{label}</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-10 h-10 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-gray-400"
        style={{ backgroundColor: value }}
        title="Click to open color picker"
      />
      <input
        ref={inputRef}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
      <span className="text-sm text-gray-500 font-mono">{value}</span>
    </div>
  );
}

export default function BrandingPage() {
  const [branding, setBranding] = useState<BrandingConfig>({
    configured: false,
    teamDisplayName: '',
    primaryColor: '#333333',
    tertiaryColor: '#F5F5F5',
    logoUrl: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadBranding() {
      try {
        const data = await api.get<BrandingConfig>('/branding');
        setBranding(data);
      } catch {
        // Use defaults
      } finally {
        setIsLoading(false);
      }
    }
    loadBranding();
  }, []);

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);
    try {
      const result = await api.put<BrandingConfig>('/branding', {
        teamDisplayName: branding.teamDisplayName,
        primaryColor: branding.primaryColor,
        tertiaryColor: branding.tertiaryColor,
      });
      setBranding({ ...result, configured: true });
      setMessage({ type: 'success', text: 'Branding saved successfully' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save branding',
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading branding...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Branding</h1>
        <Link
          href="/race-day"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Back to Race Day
        </Link>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Brand Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Display Name
            </label>
            <input
              type="text"
              value={branding.teamDisplayName ?? ''}
              onChange={(e) =>
                setBranding({ ...branding, teamDisplayName: e.target.value })
              }
              placeholder="e.g., Brighton Blazers"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <ColorWheel
            label="Primary Color"
            value={branding.primaryColor}
            onChange={(color) => setBranding({ ...branding, primaryColor: color })}
          />

          <ColorWheel
            label="Tertiary Color"
            value={branding.tertiaryColor}
            onChange={(color) =>
              setBranding({ ...branding, tertiaryColor: color })
            }
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Logo
            </label>
            <div className="flex items-center gap-4">
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt="Team logo"
                  className="w-16 h-16 object-contain border rounded"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs">
                  No logo
                </div>
              )}
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.svg"
                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setMessage(null);
                  try {
                    // Get presigned upload URL
                    const { uploadUrl, logoUrl } = await api.post<{
                      uploadUrl: string;
                      logoUrl: string;
                    }>('/branding/logo/upload-url', {
                      mimeType: file.type,
                      sizeBytes: file.size,
                      filename: file.name,
                    });

                    // Upload to S3
                    const uploadRes = await fetch(uploadUrl, {
                      method: 'PUT',
                      headers: { 'Content-Type': file.type },
                      body: file,
                    });
                    if (!uploadRes.ok) throw new Error('Upload failed');

                    // Confirm logo URL in branding
                    await api.post('/branding/logo', { logoUrl });
                    setBranding({ ...branding, logoUrl });
                    setMessage({ type: 'success', text: 'Logo uploaded successfully' });
                  } catch (err) {
                    setMessage({
                      type: 'error',
                      text: err instanceof Error ? err.message : 'Logo upload failed',
                    });
                  }
                }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              PNG, JPG, or SVG. Max 2 MB.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || !branding.teamDisplayName}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
        >
          {isSaving ? 'Saving...' : 'Save Branding'}
        </button>
      </div>

      {/* Live Preview */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-lg font-semibold p-6 pb-3">Preview</h2>
        <div
          className="mx-6 mb-2 p-4 rounded-lg text-white"
          style={{ backgroundColor: branding.primaryColor }}
        >
          <div className="flex items-center gap-3">
            {branding.logoUrl && (
              <img
                src={branding.logoUrl}
                alt=""
                className="w-8 h-8 object-contain"
              />
            )}
            <div>
              <div className="font-bold text-lg">
                {branding.teamDisplayName || 'Team Name'}
              </div>
              <div className="text-sm opacity-80">
                Event Name &mdash; 2026-08-02 &mdash; American Fork, UT
              </div>
            </div>
          </div>
        </div>
        <div className="mx-6 mb-6">
          <div
            className="p-3 rounded text-sm font-medium"
            style={{
              backgroundColor: branding.tertiaryColor,
              color: '#333',
            }}
          >
            Varsity Boys &mdash; Stage: 09:50 &mdash; Start: 10:10 &mdash; 4 laps
          </div>
          <div className="px-3 py-2 text-sm border-b">
            Adams, Dave &mdash; #201 &mdash; Arrive: 09:00
          </div>
          <div className="px-3 py-2 text-sm bg-gray-50">
            Clark, Mike &mdash; #202 &mdash; Arrive: 09:00
          </div>
        </div>
      </div>
    </div>
  );
}
