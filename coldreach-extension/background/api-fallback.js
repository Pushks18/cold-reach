export async function tryHunter(name, domain, apiKey) {
  if (!apiKey || !name || !domain) return null;
  try {
    const [first, ...rest] = name.trim().split(' ');
    const last = rest.join(' ');
    const res = await fetch(
      `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(first)}&last_name=${encodeURIComponent(last)}&api_key=${apiKey}`
    );
    const json = await res.json();
    return json.data?.email || null;
  } catch { return null; }
}

export async function tryApollo(name, domain, apiKey) {
  if (!apiKey || !name || !domain) return null;
  try {
    const res = await fetch('https://api.apollo.io/v1/people/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
      body: JSON.stringify({ name, domain }),
    });
    const json = await res.json();
    return json.person?.email || null;
  } catch { return null; }
}

export async function trySnov(name, domain, apiKey) {
  if (!apiKey || !name || !domain) return null;
  try {
    const [firstName, ...rest] = name.trim().split(' ');
    const lastName = rest.join(' ');
    const res = await fetch('https://api.snov.io/v1/get-emails-from-names', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, domain, apiKey }),
    });
    const json = await res.json();
    return json.data?.[0]?.email || null;
  } catch { return null; }
}
