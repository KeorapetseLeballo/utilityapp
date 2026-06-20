'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { graphqlFetch } from '@/lib/client';

export function ProviderProfileForm({
  bio,
  insuranceUrl,
  licenseUrl,
  backgroundCheck,
}: {
  bio: string;
  insuranceUrl: string;
  licenseUrl: string;
  backgroundCheck: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await graphqlFetch(
      `mutation($bio: String, $insuranceUrl: String, $licenseUrl: String, $backgroundCheck: Boolean) {
        updateProviderProfile(bio: $bio, insuranceUrl: $insuranceUrl, licenseUrl: $licenseUrl, backgroundCheck: $backgroundCheck) { id }
      }`,
      {
        bio: fd.get('bio') as string,
        insuranceUrl: (fd.get('insuranceUrl') as string) || undefined,
        licenseUrl: (fd.get('licenseUrl') as string) || undefined,
        backgroundCheck: fd.get('backgroundCheck') === 'on',
      },
    );
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ marginTop: '1rem' }}>
      <h2 style={{ fontSize: '1.1rem' }}>Provider profile</h2>
      {saved && <div className="alert alert-success">Profile updated.</div>}
      <div className="form-group">
        <label htmlFor="bio">Bio</label>
        <textarea id="bio" name="bio" defaultValue={bio} />
      </div>
      <div className="form-group">
        <label htmlFor="insuranceUrl">Insurance document URL</label>
        <input id="insuranceUrl" name="insuranceUrl" type="url" defaultValue={insuranceUrl} placeholder="https://..." />
      </div>
      <div className="form-group">
        <label htmlFor="licenseUrl">License document URL</label>
        <input id="licenseUrl" name="licenseUrl" type="url" defaultValue={licenseUrl} placeholder="https://..." />
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" name="backgroundCheck" defaultChecked={backgroundCheck} />
          Background check completed (required for school transport)
        </label>
      </div>
      <button type="submit" className="btn btn-primary">Save profile</button>
    </form>
  );
}
