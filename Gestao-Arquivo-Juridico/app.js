let rootDirectory = null, clientsDirectory = null, currentClient = null, officeDirectory = null;
let scannedPages = [];
let officeScannedPages = [];
let savedDirectoryWaitingPermission = null;

const categories = ['Documento pessoal', 'Documento médico', 'Documentos rurais', 'Documentos importantes', 'Documentos do escritório', 'Outros documentos'];

const categoryPresets = {
  'Documento pessoal': ['RG', 'CPF', 'CNH', 'Certidão de Nascimento', 'Certidão de Casamento', 'Comprovante de Residência', 'Carteira de Trabalho (CTPS)', 'Título de Eleitor', 'Outros'],
  'Documento médico': ['Laudo Médico', 'Receituário', 'Encaminhamento', 'Atestado Médico', 'Exame Médico', 'Prontuário Médico', 'Relatório Médico', 'Outros'],
  'Documentos rurais': ['Declaração do Sindicato', 'ITR / CCIR', 'Nota Fiscal Rural', 'Contrato de Arrendamento / Parceria', 'Certidão do INCRA', 'Talão de Produtor', 'Outros'],
  'Documentos importantes': ['Procuração', 'Contrato de Honorários', 'Termo de Requerimento', 'Extrato CNIS / INSS', 'Comprovante de Renda', 'Requerimento INSS', 'Outros'],
  'Documentos do escritório': ['Procuração Ad Judicia', 'Contrato de Honorários Advocatícios', 'Ficha de Atendimento', 'Declaração de Hipossuficiência', 'Recibo de Honorários', 'Termo de Renúncia / Substabelecimento', 'Outros'],
  'Outros documentos': ['Comprovante', 'Declaração', 'Foto / Imagem', 'Correspondência', 'Comprovante de Pagamento', 'Outros']
};

const officeCategories = [
  'Modelos & Contratos',
  'Comprovantes & Financeiro',
  'Impostos & Contabilidade',
  'Documentos Fiscais & Alvarás',
  'Outros do Escritório'
];

const officePresets = {
  'Modelos & Contratos': ['Modelo de Procuração', 'Modelo de Contrato de Honorários', 'Modelo de Requerimento INSS', 'Termo de Acordo', 'Modelo de Recibo', 'Outros'],
  'Comprovantes & Financeiro': ['Recibo de Pagamento', 'Comprovante de Energia', 'Comprovante de Água/Internet', 'Aluguel do Escritório', 'Extrato Bancário', 'Outros'],
  'Impostos & Contabilidade': ['Guia DARF / Simples', 'DAS / INSS Escritório', 'Declaração IR Escritório', 'Folha de Pagamento', 'Outros'],
  'Documentos Fiscais & Alvarás': ['Alvará de Funcionamento', 'Inscrição Municipal / Estatuto', 'Cartão CNPJ / OAB', 'Contrato Social / Sociedade', 'Outros'],
  'Outros do Escritório': ['Correspondência', 'Aviso / Comunicado', 'Certidão do Escritório', 'Foto / Imagem', 'Outros']
};

const $ = id => document.getElementById(id);
const cleanName = text => (text || '').trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ');
const setStatus = (id, text, kind = '') => { const el = $(id); if (el) { el.textContent = text; el.className = `status ${kind}`; } };
const getOrCreate = (parent, name) => parent.getDirectoryHandle(name, { create: true });

if ($('afterSaveModal')) $('afterSaveModal').style.display = 'none';
if ($('nextPageModal')) $('nextPageModal').style.display = 'none';
if ($('deleteClientModal')) $('deleteClientModal').style.display = 'none';

categories.forEach(category => {
  const option = document.createElement('option');
  option.value = option.textContent = category;
  $('category').appendChild(option);
});

officeCategories.forEach(cat => {
  const option = document.createElement('option');
  option.value = option.textContent = cat;
  $('officeCategory').appendChild(option);
});

function getPresetsForCategory(cat, isOffice = false) {
  const baseDict = isOffice ? officePresets : categoryPresets;
  const storageKey = isOffice ? 'custom_office_presets_v1' : 'custom_client_presets_v1';
  let savedCustom = {};
  try {
    savedCustom = JSON.parse(localStorage.getItem(storageKey) || '{}');
  } catch (_) {}

  const defaultList = baseDict[cat] || ['Outros'];
  const userAdded = savedCustom[cat] || [];
  
  const combined = Array.from(new Set([...defaultList.filter(o => o !== 'Outros'), ...userAdded]));
  combined.push('Outros');
  return combined;
}

function saveNewPresetForCategory(cat, newName, isOffice = false) {
  if (!newName || newName === 'Outros') return;
  const storageKey = isOffice ? 'custom_office_presets_v1' : 'custom_client_presets_v1';
  let savedCustom = {};
  try {
    savedCustom = JSON.parse(localStorage.getItem(storageKey) || '{}');
  } catch (_) {}

  if (!savedCustom[cat]) savedCustom[cat] = [];
  if (!savedCustom[cat].includes(newName)) {
    savedCustom[cat].push(newName);
    localStorage.setItem(storageKey, JSON.stringify(savedCustom));
  }
}

function updatePresetsForCategory(cat) {
  const presetSelect = $('docPreset');
  presetSelect.innerHTML = '';
  const options = getPresetsForCategory(cat, false);
  options.forEach(opt => {
    const el = document.createElement('option');
    el.value = opt;
    el.textContent = opt;
    presetSelect.appendChild(el);
  });
  updateCustomNameFromPreset();
}

function updateCustomNameFromPreset() {
  const preset = $('docPreset').value;
  const customInput = $('docCustomName');
  if (preset === 'Outros') {
    customInput.value = '';
    customInput.placeholder = 'Digite o nome do documento (ex.: RG, Laudo...);';
    customInput.focus();
  } else {
    customInput.value = preset;
  }
}

$('category').addEventListener('change', () => updatePresetsForCategory($('category').value));
$('docPreset').addEventListener('change', updateCustomNameFromPreset);

function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('arquivo-juridico-advocacia', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('pastas');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function savedFolder() {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction('pastas').objectStore('pastas').get('escritorio');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function rememberFolder(folder) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction('pastas', 'readwrite').objectStore('pastas').put(folder, 'escritorio');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
async function activateFolder(folder) {
  rootDirectory = folder;
  clientsDirectory = rootDirectory.name.toUpperCase() === 'BANCO DE DOCUMENTOS DOS CLIENTES' ? rootDirectory : await getOrCreate(rootDirectory, 'BANCO DE DOCUMENTOS DOS CLIENTES');
  officeDirectory = await getOrCreate(rootDirectory, 'DOCUMENTOS DO ESCRITÓRIO');
  for (const cat of officeCategories) {
    await getOrCreate(officeDirectory, cat);
  }
  $('storageCard').hidden = true;
  $('app').hidden = false;
  $('mainNav').hidden = false;
  await showDashboard();
}
async function restoreFolder() {
  try {
    const folder = await savedFolder(); if (!folder) return;
    if (await folder.queryPermission({ mode: 'readwrite' }) === 'granted') return activateFolder(folder);
    savedDirectoryWaitingPermission = folder;
    $('chooseFolder').textContent = 'Confirmar acesso à pasta do escritório';
    setStatus('setupStatus', 'A pasta já está registrada. Clique no botão para confirmar o acesso.', '');
  } catch (_) { }
}

$('chooseFolder').addEventListener('click', async () => {
  try {
    if (savedDirectoryWaitingPermission) {
      const permission = await savedDirectoryWaitingPermission.requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') throw new Error('Permissão não concedida.');
      await activateFolder(savedDirectoryWaitingPermission); return;
    }
    const folder = await window.showDirectoryPicker({ mode: 'readwrite' });
    await rememberFolder(folder); await activateFolder(folder);
  } catch (error) { if (error.name !== 'AbortError') setStatus('setupStatus', 'Não foi possível abrir a pasta escolhida.', 'error'); }
});
restoreFolder();

async function ensureClient(name) {
  const folder = await getOrCreate(clientsDirectory, name);
  for (const category of categories) await getOrCreate(folder, category);
  return folder;
}
async function readJson(folder, filename, fallback) {
  try { const h = await folder.getFileHandle(filename); return JSON.parse(await (await h.getFile()).text()); } catch (_) { return fallback; }
}
async function writeJson(folder, filename, data) {
  const w = await (await folder.getFileHandle(filename, { create: true })).createWritable();
  await w.write(JSON.stringify(data, null, 2));
  await w.close();
}
async function profileFor(name) { return readJson(await clientsDirectory.getDirectoryHandle(name), 'cadastro-cliente.json', null); }
async function clientNames(query = '') {
  const names = [];
  for await (const [name, h] of clientsDirectory.entries()) if (h.kind === 'directory' && name.toLowerCase().includes(query.toLowerCase())) names.push(name);
  return names.sort((a,b) => a.localeCompare(b, 'pt-BR'));
}

function view(name) { ['dashboardView','clientFormView','clientDetailView','officeView'].forEach(id => $(id).hidden = id !== name); }
async function showDashboard() { currentClient = null; view('dashboardView'); await renderClients($('searchClient').value); }
async function renderClients(query = '') {
  const output = $('clientResults'); output.innerHTML = ''; const names = await clientNames(query);
  if (!names.length) output.innerHTML = `<p class="muted">${query ? 'Nenhum cliente encontrado.' : 'Ainda não há clientes cadastrados.'}</p>`;
  for (const name of names) {
    const profile = await profileFor(name);
    const button = document.createElement('button');
    button.className = 'client-result';
    button.innerHTML = `<strong>${name}</strong><small>${(profile?.tiposAtendimento || []).join(' • ') || 'Sem tipo de atendimento informado'}</small>`;
    button.addEventListener('click', () => openClient(name));
    output.appendChild(button);
  }
}
$('searchClient').addEventListener('input', () => renderClients($('searchClient').value));
$('importCsv').addEventListener('click', () => $('csvInput').click());
$('csvInput').addEventListener('change', async () => {
  const file = $('csvInput').files[0]; if (!file) return;
  try {
    const rows = (await file.text()).replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    const headers = rows.shift().split(',').map(v => v.trim().toLowerCase()); const nameIndex = headers.indexOf('nome'); const cpfIndex = headers.indexOf('cpf');
    if (nameIndex < 0) throw new Error('O CSV precisa ter a coluna nome.'); let count = 0;
    for (const row of rows) { const values = row.split(',').map(v => v.trim()); const name = cleanName(values[nameIndex] || ''); if (!name) continue; const folder = await ensureClient(name); const old = await readJson(folder, 'cadastro-cliente.json', {}); await writeJson(folder, 'cadastro-cliente.json', { ...old, nome: name, cpf: values[cpfIndex] || old.cpf || '', criadoEm: old.criadoEm || new Date().toISOString(), atualizadoEm: new Date().toISOString() }); count++; }
    await showDashboard(); alert(`${count} cliente(s) importado(s).`);
  } catch (error) { alert(error.message || 'Não foi possível importar os dados.'); }
  $('csvInput').value = '';
});

function clearClientForm() { $('clientName').value = ''; $('clientCpf').value = ''; $('clientAddress').value = ''; $('clientPhone').value = ''; document.querySelectorAll('input[name="serviceType"]').forEach(i => i.checked = false); }
$('showClientForm').addEventListener('click', () => { currentClient = null; clearClientForm(); $('clientFormTitle').textContent = 'Adicionar cliente'; setStatus('clientStatus',''); view('clientFormView'); });
async function editClient(name) { const p = await profileFor(name); currentClient = name; $('clientFormTitle').textContent = 'Editar cliente'; $('clientName').value = name; $('clientCpf').value = p?.cpf || ''; $('clientAddress').value = p?.endereco || ''; $('clientPhone').value = p?.telefone || ''; document.querySelectorAll('input[name="serviceType"]').forEach(i => i.checked = (p?.tiposAtendimento || []).includes(i.value)); setStatus('clientStatus',''); view('clientFormView'); }

$('saveClient').addEventListener('click', async () => {
  const name = cleanName($('clientName').value); if (!name) return setStatus('clientStatus','O nome do cliente é obrigatório.','error');
  try { const folder = await ensureClient(name); const old = await readJson(folder, 'cadastro-cliente.json', null); const types = [...document.querySelectorAll('input[name="serviceType"]:checked')].map(i => i.value); await writeJson(folder, 'cadastro-cliente.json', { nome:name, cpf:$('clientCpf').value.trim(), endereco:$('clientAddress').value.trim(), telefone:$('clientPhone').value.trim(), tiposAtendimento:types, criadoEm:old?.criadoEm || new Date().toISOString(), atualizadoEm:new Date().toISOString() }); currentClient = name; $('afterSaveModal').hidden = false; $('afterSaveModal').style.display = 'grid'; } catch (_) { setStatus('clientStatus','Não foi possível salvar o cadastro.','error'); }
});
$('goDashboard').addEventListener('click', async () => { $('afterSaveModal').hidden = true; $('afterSaveModal').style.display = 'none'; await showDashboard(); });
$('scanNow').addEventListener('click', async () => { $('afterSaveModal').hidden = true; $('afterSaveModal').style.display = 'none'; await openClient(currentClient); await scanDocument(); });
document.querySelectorAll('.back').forEach(button => button.addEventListener('click', showDashboard));
$('editClient').addEventListener('click', () => editClient(currentClient));

// LOGICA DE EXCLUSAO DE CLIENTE COM VALIDAÇÃO "SIM"
$('deleteClient').addEventListener('click', () => {
  if (!currentClient) return;
  $('deleteClientModalText').innerHTML = `Esta ação irá excluir permanentemente o cadastro de <strong>"${currentClient}"</strong> e todas as suas pastas e arquivos salvos no computador.<br><br>Esta ação não poderá ser desfeita!`;
  $('deleteClientConfirmInput').value = '';
  $('btnConfirmDeleteClient').disabled = true;
  $('deleteClientModal').hidden = false;
  $('deleteClientModal').style.display = 'grid';
});

$('deleteClientConfirmInput').addEventListener('input', () => {
  const typed = $('deleteClientConfirmInput').value.trim().toUpperCase();
  $('btnConfirmDeleteClient').disabled = (typed !== 'SIM');
});

$('btnCancelDeleteClient').addEventListener('click', () => {
  $('deleteClientModal').hidden = true;
  $('deleteClientModal').style.display = 'none';
});

$('btnConfirmDeleteClient').addEventListener('click', async () => {
  if (!currentClient) return;
  const clientToDelete = currentClient;
  try {
    $('deleteClientModal').hidden = true;
    $('deleteClientModal').style.display = 'none';
    
    await clientsDirectory.removeEntry(clientToDelete, { recursive: true });
    alert(`O cliente "${clientToDelete}" foi excluído com sucesso.`);
    await showDashboard();
  } catch (err) {
    console.error(err);
    alert(`Não foi possível excluir o cliente "${clientToDelete}".`);
  }
});

async function openClient(name) {
  currentClient = name;
  const profile = await profileFor(name);
  $('detailName').textContent = name;
  const info = [profile?.cpf && `CPF: ${profile.cpf}`, profile?.telefone && `Telefone: ${profile.telefone}`, profile?.endereco, (profile?.tiposAtendimento || []).join(' • ')].filter(Boolean);
  $('detailInfo').textContent = info.join(' | ') || 'Dados adicionais ainda não informados.';
  
  if ($('docDate')) {
    $('docDate').value = new Date().toISOString().slice(0, 10);
  }
  $('category').value = categories[0];
  updatePresetsForCategory(categories[0]);
  
  clearScannedPages();
  setStatus('documentStatus', '');
  view('clientDetailView');
  await renderDocuments();
}

function clearScannedPages() {
  scannedPages.forEach(p => { if (p.objectUrl) URL.revokeObjectURL(p.objectUrl); });
  scannedPages = [];
  renderPagesGrid();
}

function addScannedPage(blob, name = '') {
  const objectUrl = URL.createObjectURL(blob);
  scannedPages.push({
    id: Date.now() + Math.random(),
    blob: blob,
    objectUrl: objectUrl,
    name: name || `Página ${scannedPages.length + 1}`
  });
  renderPagesGrid();
}

function removeScannedPage(index) {
  if (scannedPages[index]) {
    if (scannedPages[index].objectUrl) URL.revokeObjectURL(scannedPages[index].objectUrl);
    scannedPages.splice(index, 1);
    renderPagesGrid();
  }
}

function renderPagesGrid() {
  const container = $('pagesGridContainer');
  const summary = $('pagesSummaryContainer');
  const badge = $('pagesBadge');
  const nextBtn = $('scanNextPage');
  const saveBtn = $('saveDocument');

  container.innerHTML = '';
  const total = scannedPages.length;

  if (total === 0) {
    summary.hidden = true;
    nextBtn.hidden = true;
    saveBtn.disabled = true;
    return;
  }

  summary.hidden = false;
  nextBtn.hidden = false;
  saveBtn.disabled = false;
  badge.textContent = `📄 Páginas do documento: ${total}`;

  scannedPages.forEach((page, idx) => {
    const card = document.createElement('div');
    card.className = 'page-card';

    const img = document.createElement('img');
    img.src = page.objectUrl;
    img.alt = `Página ${idx + 1}`;

    const numSpan = document.createElement('span');
    numSpan.className = 'page-number';
    numSpan.textContent = `Página ${idx + 1}`;

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'page-remove-btn';
    delBtn.textContent = '❌ Remover';
    delBtn.addEventListener('click', () => removeScannedPage(idx));

    card.appendChild(img);
    card.appendChild(numSpan);
    card.appendChild(delBtn);
    container.appendChild(card);
  });
}

function promptNextPageModal() {
  const total = scannedPages.length;
  $('nextPageModalText').textContent = `Página ${total} digitalizada com sucesso! Deseja digitalizar a página ${total + 1} deste mesmo documento?`;
  $('nextPageModal').hidden = false;
  $('nextPageModal').style.display = 'grid';
}

$('btnScanAnotherPage').addEventListener('click', async () => {
  $('nextPageModal').hidden = true;
  $('nextPageModal').style.display = 'none';
  await scanDocument();
});

$('btnFinishDocument').addEventListener('click', () => {
  $('nextPageModal').hidden = true;
  $('nextPageModal').style.display = 'none';
  setStatus('documentStatus', `${scannedPages.length} página(s) pronta(s)! Clique em 'Salvar documento final'.`, 'success');
});

$('fileInput').addEventListener('change', async e => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  for (const file of files) {
    addScannedPage(file, file.name);
  }
  $('fileInput').value = '';
  setStatus('documentStatus', `${files.length} arquivo(s) adicionado(s) às páginas!`, 'success');
});

async function scanDocument() {
  try {
    setStatus('documentStatus', `Aguarde: digitalizando página ${scannedPages.length + 1} pelo scanner (300 DPI)...`);
    const response = await fetch('/api/digitalizar', { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    const blob = await (await fetch(data.arquivo)).blob();
    addScannedPage(blob, `Digitalização - Folha ${scannedPages.length + 1}`);
    setStatus('documentStatus', `Folha ${scannedPages.length} digitalizada!`, 'success');
    promptNextPageModal();
  } catch(error) {
    setStatus('documentStatus', error.message || 'Não foi possível digitalizar.', 'error');
  }
}

$('openScanner').addEventListener('click', scanDocument);
$('scanNextPage').addEventListener('click', scanDocument);

async function imageBlobToCanvas(blob, maxWidth = 1600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve({ dataUrl, width: w, height: h });
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

async function compilePagesToPdfChunks(pageItems, maxSizeBytes = 1000 * 1024) {
  const { jsPDF } = window.jspdf;
  const chunks = [];
  let currentPages = [];

  for (let i = 0; i < pageItems.length; i++) {
    currentPages.push(pageItems[i]);

    const testPdf = new jsPDF({ unit: 'mm', format: 'a4' });
    for (let j = 0; j < currentPages.length; j++) {
      if (j > 0) testPdf.addPage();
      const imgInfo = await imageBlobToCanvas(currentPages[j].blob);
      const pdfW = 210;
      const pdfH = (imgInfo.height * pdfW) / imgInfo.width;
      testPdf.addImage(imgInfo.dataUrl, 'JPEG', 0, 0, pdfW, Math.min(pdfH, 297));
    }

    const testBlob = testPdf.output('blob');

    if (testBlob.size > maxSizeBytes && currentPages.length > 1) {
      currentPages.pop();
      const chunkPdf = new jsPDF({ unit: 'mm', format: 'a4' });
      for (let j = 0; j < currentPages.length; j++) {
        if (j > 0) chunkPdf.addPage();
        const imgInfo = await imageBlobToCanvas(currentPages[j].blob);
        const pdfW = 210;
        const pdfH = (imgInfo.height * pdfW) / imgInfo.width;
        chunkPdf.addImage(imgInfo.dataUrl, 'JPEG', 0, 0, pdfW, Math.min(pdfH, 297));
      }
      chunks.push(chunkPdf.output('blob'));
      currentPages = [pageItems[i]];
    }
  }

  if (currentPages.length > 0) {
    const chunkPdf = new jsPDF({ unit: 'mm', format: 'a4' });
    for (let j = 0; j < currentPages.length; j++) {
      if (j > 0) chunkPdf.addPage();
      const imgInfo = await imageBlobToCanvas(currentPages[j].blob);
      const pdfW = 210;
      const pdfH = (imgInfo.height * pdfW) / imgInfo.width;
      chunkPdf.addImage(imgInfo.dataUrl, 'JPEG', 0, 0, pdfW, Math.min(pdfH, 297));
    }
    chunks.push(chunkPdf.output('blob'));
  }

  return chunks;
}

async function getUniqueFileName(directoryHandle, desiredFileName) {
  let fileName = desiredFileName;
  const match = desiredFileName.match(/^(.*?)(?: \((\d+)\))?(\.[a-zA-Z0-9]+)$/);
  const baseName = match ? match[1] : desiredFileName.replace(/\.[^/.]+$/, '');
  const ext = match ? match[3] : '.pdf';

  let counter = 1;
  while (true) {
    try {
      await directoryHandle.getFileHandle(fileName);
      counter++;
      fileName = `${baseName} (${counter})${ext}`;
    } catch (err) {
      return fileName;
    }
  }
}

$('saveDocument').addEventListener('click', async () => {
  if (!scannedPages.length || !currentClient) return;
  const category = $('category').value;
  const dateValue = $('docDate').value || new Date().toISOString().slice(0, 10);

  let rawName = cleanName($('docCustomName').value);
  if (!rawName) {
    const presetVal = $('docPreset').value;
    rawName = presetVal !== 'Outros' ? cleanName(presetVal) : '';
  }
  if (!rawName) {
    rawName = 'Documento';
  }

  try {
    setStatus('documentStatus', 'Processando e compilando PDF das páginas em 300 DPI...');
    const pdfChunks = await compilePagesToPdfChunks(scannedPages, 1000 * 1024);

    const clientFolder = await clientsDirectory.getDirectoryHandle(currentClient);
    const categoryFolder = await getOrCreate(clientFolder, category);
    const records = await readJson(clientFolder, 'registro-documentos.json', []);

    const savedFiles = [];

    for (let index = 0; index < pdfChunks.length; index++) {
      const chunkBlob = pdfChunks[index];
      const partSuffix = pdfChunks.length > 1 ? ` (Parte ${index + 1})` : '';
      const desiredFileName = `${dateValue} - ${rawName}${partSuffix}.pdf`;
      const finalFileName = await getUniqueFileName(categoryFolder, desiredFileName);

      const writable = await (await categoryFolder.getFileHandle(finalFileName, { create: true })).createWritable();
      await writable.write(chunkBlob);
      await writable.close();

      records.push({
        nome: currentClient,
        classificacao: category,
        dataInclusao: dateValue,
        nomeDocumento: finalFileName.replace(/\.pdf$/i, ''),
        arquivo: `${category}/${finalFileName}`,
        registradoEm: new Date().toISOString()
      });

      savedFiles.push(finalFileName);
    }

    await writeJson(clientFolder, 'registro-documentos.json', records);

    saveNewPresetForCategory(category, rawName, false);
    updatePresetsForCategory(category);

    clearScannedPages();
    $('fileInput').value = '';

    const msg = savedFiles.length > 1
      ? `Documento salvo em ${savedFiles.length} partes PDF (máx. 1000 KB cada): ${savedFiles.join(', ')}`
      : `Documento "${savedFiles[0]}" salvo com sucesso!`;

    setStatus('documentStatus', msg, 'success');
    await renderDocuments();
  } catch (err) {
    console.error(err);
    setStatus('documentStatus', 'Não foi possível compilar e salvar o documento PDF.', 'error');
  }
});

async function renderDocuments() {
  const folder = await clientsDirectory.getDirectoryHandle(currentClient);
  const records = await readJson(folder, 'registro-documentos.json', []);
  const target = $('documentFolders');
  target.innerHTML = '';

  for (const category of categories) {
    const card = document.createElement('section');
    card.className = 'folder';
    const catFolder = await getOrCreate(folder, category);

    const files = [];
    for await (const [name, handle] of catFolder.entries()) {
      if (handle.kind === 'file' && name !== 'cadastro-cliente.json' && name !== 'registro-documentos.json') {
        files.push(name);
      }
    }
    files.sort((a, b) => b.localeCompare(a, 'pt-BR'));

    const ul = document.createElement('ul');

    if (!files.length) {
      ul.innerHTML = '<li class="muted">Nenhum documento</li>';
    } else {
      for (const fileName of files) {
        const li = document.createElement('li');
        li.className = 'doc-item';
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'doc-item-title';
        titleSpan.textContent = `📄 ${fileName}`;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'doc-item-actions';
        
        const viewBtn = document.createElement('button');
        viewBtn.type = 'button';
        viewBtn.className = 'doc-btn doc-btn-view';
        viewBtn.textContent = '👁️ Abrir';
        viewBtn.addEventListener('click', async () => {
          try {
            const fileHandle = await catFolder.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            const fileUrl = URL.createObjectURL(file);
            window.open(fileUrl, '_blank');
          } catch (e) {
            alert('Não foi possível abrir o arquivo.');
          }
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'doc-btn doc-btn-del';
        delBtn.textContent = '🗑️ Excluir';
        delBtn.addEventListener('click', async () => {
          if (confirm(`Tem certeza que deseja excluir "${fileName}"?`)) {
            try {
              await catFolder.removeEntry(fileName);
              const updatedRecords = records.filter(r => r.arquivo !== `${category}/${fileName}`);
              await writeJson(folder, 'registro-documentos.json', updatedRecords);
              await renderDocuments();
            } catch (e) {
              alert('Não foi possível excluir o arquivo.');
            }
          }
        });

        actionsDiv.appendChild(viewBtn);
        actionsDiv.appendChild(delBtn);
        li.appendChild(titleSpan);
        li.appendChild(actionsDiv);
        ul.appendChild(li);
      }
    }

    card.innerHTML = `<h4>${category}</h4>`;
    card.appendChild(ul);
    target.appendChild(card);
  }
}

// -------------------------------------------------------------
// GESTÃO DE DOCUMENTOS DO ESCRITÓRIO
// -------------------------------------------------------------

function updateOfficePresetsForCategory(cat) {
  const presetSelect = $('officeDocPreset');
  presetSelect.innerHTML = '';
  const options = getPresetsForCategory(cat, true);
  options.forEach(opt => {
    const el = document.createElement('option');
    el.value = opt;
    el.textContent = opt;
    presetSelect.appendChild(el);
  });
  updateOfficeCustomNameFromPreset();
}

function updateOfficeCustomNameFromPreset() {
  const preset = $('officeDocPreset').value;
  const customInput = $('officeDocCustomName');
  if (preset === 'Outros') {
    customInput.value = '';
    customInput.placeholder = 'Digite o nome do documento do escritório...';
    customInput.focus();
  } else {
    customInput.value = preset;
  }
}

$('officeCategory').addEventListener('change', () => updateOfficePresetsForCategory($('officeCategory').value));
$('officeDocPreset').addEventListener('change', updateOfficeCustomNameFromPreset);

$('tabClients').addEventListener('click', async () => {
  $('tabClients').classList.add('active');
  $('tabOffice').classList.remove('active');
  $('toolbar').hidden = false;
  view('dashboardView');
  await showDashboard();
});

$('tabOffice').addEventListener('click', async () => {
  $('tabOffice').classList.add('active');
  $('tabClients').classList.remove('active');
  $('toolbar').hidden = true;
  view('officeView');
  await openOfficeView();
});

async function openOfficeView() {
  if ($('officeDocDate')) {
    $('officeDocDate').value = new Date().toISOString().slice(0, 10);
  }
  $('officeCategory').value = officeCategories[0];
  updateOfficePresetsForCategory(officeCategories[0]);
  clearOfficeScannedPages();
  setStatus('officeDocumentStatus', '');
  await renderOfficeDocuments();
}

function clearOfficeScannedPages() {
  officeScannedPages.forEach(p => { if (p.objectUrl) URL.revokeObjectURL(p.objectUrl); });
  officeScannedPages = [];
  renderOfficePagesGrid();
}

function addOfficeScannedPage(blob, name = '') {
  const objectUrl = URL.createObjectURL(blob);
  officeScannedPages.push({
    id: Date.now() + Math.random(),
    blob: blob,
    objectUrl: objectUrl,
    name: name || `Página ${officeScannedPages.length + 1}`
  });
  renderOfficePagesGrid();
}

function removeOfficeScannedPage(index) {
  if (officeScannedPages[index]) {
    if (officeScannedPages[index].objectUrl) URL.revokeObjectURL(officeScannedPages[index].objectUrl);
    officeScannedPages.splice(index, 1);
    renderOfficePagesGrid();
  }
}

function renderOfficePagesGrid() {
  const container = $('officePagesGridContainer');
  const summary = $('officePagesSummaryContainer');
  const badge = $('officePagesBadge');
  const nextBtn = $('scanOfficeNextPage');
  const saveBtn = $('saveOfficeDocument');

  container.innerHTML = '';
  const total = officeScannedPages.length;

  if (total === 0) {
    summary.hidden = true;
    nextBtn.hidden = true;
    saveBtn.disabled = true;
    return;
  }

  summary.hidden = false;
  nextBtn.hidden = false;
  saveBtn.disabled = false;
  badge.textContent = `📄 Páginas do documento: ${total}`;

  officeScannedPages.forEach((page, idx) => {
    const card = document.createElement('div');
    card.className = 'page-card';

    const img = document.createElement('img');
    img.src = page.objectUrl;
    img.alt = `Página ${idx + 1}`;

    const numSpan = document.createElement('span');
    numSpan.className = 'page-number';
    numSpan.textContent = `Página ${idx + 1}`;

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'page-remove-btn';
    delBtn.textContent = '❌ Remover';
    delBtn.addEventListener('click', () => removeOfficeScannedPage(idx));

    card.appendChild(img);
    card.appendChild(numSpan);
    card.appendChild(delBtn);
    container.appendChild(card);
  });
}

$('officeFileInput').addEventListener('change', async e => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  for (const file of files) {
    addOfficeScannedPage(file, file.name);
  }
  $('officeFileInput').value = '';
  setStatus('officeDocumentStatus', `${files.length} arquivo(s) adicionado(s)!`, 'success');
});

async function scanOfficeDocument() {
  try {
    setStatus('officeDocumentStatus', `Digitalizando página ${officeScannedPages.length + 1} para o escritório (300 DPI)...`);
    const response = await fetch('/api/digitalizar', { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    const blob = await (await fetch(data.arquivo)).blob();
    addOfficeScannedPage(blob, `Digitalização Escritório - Folha ${officeScannedPages.length + 1}`);
    setStatus('officeDocumentStatus', `Folha ${officeScannedPages.length} digitalizada com sucesso!`, 'success');
  } catch(error) {
    setStatus('officeDocumentStatus', error.message || 'Não foi possível digitalizar.', 'error');
  }
}

$('openOfficeScanner').addEventListener('click', scanOfficeDocument);
$('scanOfficeNextPage').addEventListener('click', scanOfficeDocument);

$('saveOfficeDocument').addEventListener('click', async () => {
  if (!officeScannedPages.length || !officeDirectory) return;
  const category = $('officeCategory').value;
  const dateValue = $('officeDocDate').value || new Date().toISOString().slice(0, 10);

  let rawName = cleanName($('officeDocCustomName').value);
  if (!rawName) {
    const presetVal = $('officeDocPreset').value;
    rawName = presetVal !== 'Outros' ? cleanName(presetVal) : '';
  }
  if (!rawName) {
    rawName = 'Documento do Escritorio';
  }

  try {
    setStatus('officeDocumentStatus', 'Processando e salvando PDF do escritório...');
    const pdfChunks = await compilePagesToPdfChunks(officeScannedPages, 1000 * 1024);

    const categoryFolder = await getOrCreate(officeDirectory, category);
    const records = await readJson(officeDirectory, 'registro-documentos-escritorio.json', []);
    const savedFiles = [];

    for (let index = 0; index < pdfChunks.length; index++) {
      const chunkBlob = pdfChunks[index];
      const partSuffix = pdfChunks.length > 1 ? ` (Parte ${index + 1})` : '';
      const desiredFileName = `${dateValue} - ${rawName}${partSuffix}.pdf`;
      const finalFileName = await getUniqueFileName(categoryFolder, desiredFileName);

      const writable = await (await categoryFolder.getFileHandle(finalFileName, { create: true })).createWritable();
      await writable.write(chunkBlob);
      await writable.close();

      records.push({
        classificacao: category,
        dataInclusao: dateValue,
        nomeDocumento: finalFileName.replace(/\.pdf$/i, ''),
        arquivo: `${category}/${finalFileName}`,
        registradoEm: new Date().toISOString()
      });

      savedFiles.push(finalFileName);
    }

    await writeJson(officeDirectory, 'registro-documentos-escritorio.json', records);

    saveNewPresetForCategory(category, rawName, true);
    updateOfficePresetsForCategory(category);

    clearOfficeScannedPages();
    $('officeFileInput').value = '';

    const msg = savedFiles.length > 1
      ? `Documento do escritório salvo em ${savedFiles.length} partes PDF (máx. 1000 KB cada): ${savedFiles.join(', ')}`
      : `Documento "${savedFiles[0]}" salvo com sucesso!`;

    setStatus('officeDocumentStatus', msg, 'success');
    await renderOfficeDocuments();
  } catch (err) {
    console.error(err);
    setStatus('officeDocumentStatus', 'Não foi possível salvar o documento do escritório.', 'error');
  }
});

async function renderOfficeDocuments() {
  if (!officeDirectory) return;
  const records = await readJson(officeDirectory, 'registro-documentos-escritorio.json', []);
  const target = $('officeFolders');
  target.innerHTML = '';

  for (const category of officeCategories) {
    const card = document.createElement('section');
    card.className = 'folder';
    const catFolder = await getOrCreate(officeDirectory, category);

    const files = [];
    for await (const [name, handle] of catFolder.entries()) {
      if (handle.kind === 'file' && name !== 'registro-documentos-escritorio.json') {
        files.push(name);
      }
    }
    files.sort((a, b) => b.localeCompare(a, 'pt-BR'));

    const ul = document.createElement('ul');

    if (!files.length) {
      ul.innerHTML = '<li class="muted">Nenhum documento nesta pasta</li>';
    } else {
      for (const fileName of files) {
        const li = document.createElement('li');
        li.className = 'doc-item';
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'doc-item-title';
        titleSpan.textContent = `📄 ${fileName}`;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'doc-item-actions';
        
        const viewBtn = document.createElement('button');
        viewBtn.type = 'button';
        viewBtn.className = 'doc-btn doc-btn-view';
        viewBtn.textContent = '👁️ Abrir';
        viewBtn.addEventListener('click', async () => {
          try {
            const fileHandle = await catFolder.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            const fileUrl = URL.createObjectURL(file);
            window.open(fileUrl, '_blank');
          } catch (e) {
            alert('Não foi possível abrir o arquivo.');
          }
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'doc-btn doc-btn-del';
        delBtn.textContent = '🗑️ Excluir';
        delBtn.addEventListener('click', async () => {
          if (confirm(`Tem certeza que deseja excluir "${fileName}" dos documentos do escritório?`)) {
            try {
              await catFolder.removeEntry(fileName);
              const updatedRecords = records.filter(r => r.arquivo !== `${category}/${fileName}`);
              await writeJson(officeDirectory, 'registro-documentos-escritorio.json', updatedRecords);
              await renderOfficeDocuments();
            } catch (e) {
              alert('Não foi possível excluir o arquivo.');
            }
          }
        });

        actionsDiv.appendChild(viewBtn);
        actionsDiv.appendChild(delBtn);
        li.appendChild(titleSpan);
        li.appendChild(actionsDiv);
        ul.appendChild(li);
      }
    }

    card.innerHTML = `<h4>${category}</h4>`;
    card.appendChild(ul);
    target.appendChild(card);
  }
}


