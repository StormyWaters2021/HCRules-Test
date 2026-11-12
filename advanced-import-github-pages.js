/* GitHub Pages importer: no server-side functions and no credentials.
   HCUnits is queried directly when CORS allows it; saved public HTML/JSON
   can be imported in the browser when CORS prevents cross-site reads. */

function advTeamIdFromUrl(value) {
  const url = new URL(value);
  if (!['hcunits.net', 'www.hcunits.net'].includes(url.hostname)) throw new Error('Enter an HCUnits team link.');
  const id = url.pathname.match(/^\/teams\/([a-f\d-]{36})\/?$/i)?.[1];
  if (!id) throw new Error('Enter an HCUnits team link ending in the team ID.');
  return id;
}

function advParseTeamHtml(source) {
  let documentSource = new DOMParser().parseFromString(source, 'text/html');
  let script = documentSource.querySelector('script#teamObject');
  if (!script) {
    // Chrome Ctrl+U, Ctrl+S may save the view-source syntax highlighter.
    const rows = documentSource.querySelectorAll('.line-content');
    if (rows.length) {
      const sourceText = [...rows].map(row => row.textContent).join('\n');
      documentSource = new DOMParser().parseFromString(sourceText, 'text/html');
      script = documentSource.querySelector('script#teamObject');
    }
  }
  if (!script) throw new Error('No teamObject found. Save the HCUnits TEAM page source with Ctrl+U then Ctrl+S.');
  const data = JSON.parse(script.textContent);
  if (!Array.isArray(data.units)) throw new Error('The HTML contains no HCUnits team list.');
  return data;
}

function advReadTeam(data, link) {
  if (!Array.isArray(data.units)) throw new Error('Not a valid HCUnits team.');
  const entries = data.units
    .filter(entry => entry.section === 'main_force' && entry.unit?.id)
    .map(entry => ({ key: String(entry.id), id: entry.unit.id,
      name: entry.unit.name || entry.unit.id, points: entry.point_value }));
  if (!entries.length) throw new Error('This team has no main-force figures.');
  advancedTeam = {
    name: data.public_name || data.name_safe || 'HCUnits Team',
    url: link || '', units: [], missing: entries
  };
  advSave();
  advRenderUnits();
  advUpdateHeading();
  return entries;
}

function advImportUnitData(data) {
  if (typeof data?.id !== 'string' || !Array.isArray(data.dial) || !data.dial.length) {
    throw new Error('A unit response must contain an id and nonempty dial array.');
  }
  const matches = (advancedTeam.missing || [])
    .filter(entry => entry.id.toLowerCase() === data.id.toLowerCase());
  if (!matches.length) return 0;

  for (const entry of matches) {
    const point = (data.point_values || []).find(p => Number(p.point_value) === Number(entry.points))
      || data.point_values?.[0] || {};
    const click = Number(point.click_number || data.dial[0].click_number);
    const starting = data.dial.some(d => Number(d.click_number) === click)
      ? click : Number(data.dial[0].click_number);
    const unit = {
      key: entry.key, id: data.id, name: data.name || entry.name, points: entry.points,
      click: starting, dial: data.dial, range: data.unit_range, targets: data.targets,
      combat_symbols: point.combat_symbols || data.combat_symbols || [],
      special_powers: data.special_powers || [], custom: [], used: {}, ready: {}
    };
    const existingIndex = advancedTeam.units.findIndex(u => u.key === unit.key);
    if (existingIndex === -1) advancedTeam.units.push(unit);
    else advancedTeam.units[existingIndex] = unit;
  }
  advancedTeam.missing = advancedTeam.missing.filter(
    entry => entry.id.toLowerCase() !== data.id.toLowerCase());
  advSave();advRenderUnits();advUpdateHeading();
  return matches.length;
}

async function advTryPublicFetch(url, expectJson) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 12000);
  try {
    const response = await fetch(url, {
      credentials: 'omit', signal: abort.signal,
      headers: { Accept: expectJson ? 'application/json' : 'text/html' }
    });
    if (!response.ok) throw new Error('HCUnits returned HTTP ' + response.status);
    return expectJson ? response.json() : response.text();
  } finally { clearTimeout(timer); }
}

async function advTryAllUnitFetches(entries) {
  let loaded = 0;
  const ids = [...new Set(entries.map(entry => entry.id))];
  const outcomes = await Promise.allSettled(ids.map(async id => {
    const response = await advTryPublicFetch(
      'https://hcunits.net/api/v1/units/' + encodeURIComponent(id) + '/', true);
    return advImportUnitData(response);
  }));
  for (const outcome of outcomes) if (outcome.status === 'fulfilled') loaded += outcome.value;
  return loaded;
}

function advLoadModal() {
  const { layer, panel } = advModal('Load Team from HCUnits');
  const form = E('form', 'advanced-form');
  const address = E('label', '', 'HCUnits Team URL');
  const input = E('input', 'advanced-field');
  input.type = 'url';input.placeholder = 'https://hcunits.net/teams/.../';
  input.value = advancedTeam.url || '';address.append(input);
  const load = button('Load from Link', null, 'game-tools-action');load.type = 'submit';
  const status = E('p', 'advanced-load-status');status.setAttribute('role','status');
  const fallback = E('p', 'advanced-modal-note',
    'GitHub Pages runs without a backend. If HCUnits blocks direct browser access, import the team page source and unit JSON below. These files stay in your browser.');

  const teamLabel = E('label', '', 'Import saved HCUnits team page (HTML)');
  const teamFile = E('input', 'advanced-field');
  teamFile.type = 'file'; teamFile.accept = '.html,.htm,text/html'; teamLabel.append(teamFile);

  const unitLabel = E('label', '', 'Import HCUnits unit JSON files');
  const unitFile = E('input', 'advanced-field');
  unitFile.type = 'file'; unitFile.accept = '.json,application/json';
  unitFile.multiple = true;unitLabel.append(unitFile);

  const pasteLabel = E('label', '', 'Or paste one HCUnits unit JSON response');
  const paste = E('textarea', 'advanced-field');paste.rows=4;
  paste.placeholder = '{ "id": "dcx001", "dial": [...] }';pasteLabel.append(paste);
  const pasteButton = button('Import Pasted Unit', () => {
    try {
      const count = advImportUnitData(JSON.parse(paste.value));
      if (!count) throw new Error('This unit is not among the remaining team entries.');
      status.textContent = 'Imported ' + count + ' team entries.';
      paste.value = '';renderRemaining();
    } catch (error) { status.textContent = error.message; }
  }, 'game-tools-action');

  const missingBox = E('div','advanced-missing-units');
  const renderRemaining = () => {
    missingBox.replaceChildren();
    const missing = advancedTeam.missing || [];
    if (!missing.length) {
      if (advancedTeam.units.length) missingBox.append(E('strong','',
        'All ' + advancedTeam.units.length + ' team entries are ready.'));
      return;
    }
    missingBox.append(E('strong','', missing.length + ' remaining unit entries:'));
    for (const entry of missing) {
      const line = E('div','advanced-missing-unit');
      line.append(E('span','',entry.name + ' (' + entry.id + ')'));
      const link = E('a','','Open JSON');
      link.href='https://hcunits.net/api/v1/units/'+encodeURIComponent(entry.id)+'/';
      link.target='_blank';link.rel='noopener noreferrer';
      line.append(link);missingBox.append(line);
    }
  };
  renderRemaining();

  form.onsubmit = async event => {
    event.preventDefault();
    let teamId;
    try {teamId = advTeamIdFromUrl(input.value)}
    catch(error) {status.textContent=error.message;return}
    load.disabled = true;status.textContent = 'Trying to read the HCUnits team…';
    try {
      const html = await advTryPublicFetch('https://hcunits.net/teams/'+teamId+'/', false);
      const entries = advReadTeam(advParseTeamHtml(html), input.value);
      status.textContent = 'Found '+entries.length+' entries; loading dials…';
      const loaded = await advTryAllUnitFetches(entries);
      status.textContent = loaded+' entries loaded from HCUnits. '+
        (advancedTeam.missing.length ? 'For the rest, use saved unit JSON.' : 'All done!');
      renderRemaining();
    } catch (error) {
      status.textContent = 'Direct access was blocked or failed. Import the saved team HTML below.';
    } finally {load.disabled=false}
  };

  teamFile.addEventListener('change', async () => {
    if (!teamFile.files?.length) return;
    try {
      const text = await teamFile.files[0].text();
      const entries = advReadTeam(advParseTeamHtml(text),input.value);
      status.textContent = 'Found '+entries.length+' entries; trying their unit data…';
      renderRemaining();
      const loaded = await advTryAllUnitFetches(entries);
      status.textContent = 'Loaded '+loaded+' entries automatically. '+
        (advancedTeam.missing.length ? 'Import saved unit JSON for the remainder.' : 'All done!');
      renderRemaining();
    } catch (error) {status.textContent=error.message}
    teamFile.value = '';
  });

  unitFile.addEventListener('change', async () => {
    let total = 0; const problems=[];
    for (const file of unitFile.files || []) {
      try {
        const count = advImportUnitData(JSON.parse(await file.text()));
        if (!count) throw new Error('not part of this team');
        total += count;
      } catch (error) { problems.push(file.name+': '+error.message); }
    }
    status.textContent='Imported '+total+' entries. '+
      (advancedTeam.missing?.length||0)+' still needed.'+
      (problems.length?' Skipped '+problems.join('; '):'');
    renderRemaining();unitFile.value='';
  });

  form.append(address,load,fallback,teamLabel,unitLabel,pasteLabel,pasteButton,status,missingBox);
  panel.append(form);input.focus();
}
