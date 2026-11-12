/* HCUnits API adapter for the GitHub Pages Advanced Ability Tracker.
   The actual proxy is hosted separately at Vercel. */
const CLIXRULES_HCUNITS_API = 'https://clixrules-hcunits-api.vercel.app';
advGetJson = async function(path) {
  const match = String(path).match(/^(team|unit)\/([a-z0-9-]+)$/i);
  if (!match) throw new Error('Invalid HCUnits resource.');
  const [, type, id] = match;
  const endpoint = `${CLIXRULES_HCUNITS_API}/api/${type}?id=${encodeURIComponent(id)}`;
  let response;
  try {
    response = await fetch(endpoint, {method:'GET', headers:{Accept:'application/json'}});
  } catch (error) {
    throw new Error('Unable to connect to the HCUnits data service. Check that the API is available.');
  }
  let result;
  try { result = await response.json(); }
  catch (_) { throw new Error('The HCUnits service returned an invalid response.'); }
  if (!response.ok) throw new Error(result?.error || `HCUnits import failed (HTTP ${response.status}).`);
  return result;
};
