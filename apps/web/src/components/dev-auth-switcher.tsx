'use client';

import { useEffect, useState } from 'react';
import { AUTH_BYPASS, getDevAuthProviderId, setDevAuthProviderId } from '@/lib/auth';

const demoUsers = [
  { id: 'demo_creator_1', label: 'Demo Creator 1 (T1)' },
  { id: 'demo_creator_2', label: 'Demo Creator 2 (T2)' },
  { id: 'demo_creator_3', label: 'Demo Creator 3 (T3)' },
  { id: 'demo_admin_1', label: 'Demo Admin' },
];

export function DevAuthSwitcher() {
  const [value, setValue] = useState('demo_creator_1');

  useEffect(() => {
    if (!AUTH_BYPASS) {
      return;
    }
    setValue(getDevAuthProviderId());
  }, []);

  if (!AUTH_BYPASS) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <label className="flex items-center gap-2">
        <span className="font-medium">Demo user:</span>
        <select
          className="rounded border border-amber-300 bg-white px-2 py-1"
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            setValue(next);
            setDevAuthProviderId(next);
            window.location.reload();
          }}
        >
          {demoUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
