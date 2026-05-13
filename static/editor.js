let dirHandle = null;
let fileHandles = {};   // { "pasta/arquivo.js": fileHandle }
let currentFile = null; // caminho completo
let editor = null;
let openTabs = [];      // { path, displayName, modified }

const LANG_MAP = {
    js: 'javascript', ts: 'typescript', html: 'html', css: 'css',
    py: 'python', json: 'json', md: 'markdown', xml: 'xml',
    sql: 'sql', sh: 'shell', txt: 'plaintext', yml: 'yaml', yaml: 'yaml'
};
const LANG_LABEL = {
    javascript: 'JavaScript', typescript: 'TypeScript', html: 'HTML',
    css: 'CSS', python: 'Python', json: 'JSON', markdown: 'Markdown',
    xml: 'XML', sql: 'SQL', shell: 'Shell', plaintext: 'Texto', yaml: 'YAML'
};

// ── Monaco ──
require.config({ paths: { 'vs': '/static/vs' } });
require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('editor'), {
        value: '',
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14,
        fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
        fontLigatures: true,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        renderLineHighlight: 'all',
        cursorBlinking: 'smooth',
        smoothScrolling: true,
        tabSize: 4,
    });

    editor.onDidChangeCursorPosition((e) => {
        const p = e.position;
        document.getElementById('status-position').textContent = `Ln ${p.lineNumber}, Col ${p.column}`;
    });

    editor.onDidChangeModelContent(() => {
        if (currentFile) markModified(currentFile);
    });

    window.addEventListener('keydown', async (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            await saveFile();
        }
    });
});

// ── Activity Bar toggle ──
document.querySelector('.activity-btn').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const btn = document.querySelector('.activity-btn');
    const hidden = sidebar.style.display === 'none';
    sidebar.style.display = hidden ? 'flex' : 'none';
    btn.classList.toggle('active', hidden);
});

// ── Abrir Pasta ──
document.getElementById('btn-open-folder').addEventListener('click', openFolder);

async function openFolder() {
    try {
        dirHandle = await window.showDirectoryPicker();
        document.getElementById('folder-name').textContent = dirHandle.name.toUpperCase();
        document.getElementById('folder-row').style.display = 'flex';
        document.getElementById('btn-new-file').removeAttribute('disabled');
        await loadFiles();
    } catch (err) { /* cancelado */ }
}

// ── Árvore de Arquivos ──
async function loadFiles() {
    const ul = document.getElementById('file-list');
    ul.innerHTML = '';
    fileHandles = {};
    await renderDir(dirHandle, ul, 0, '');
}

async function renderDir(handle, container, depth, prefix) {
    const folders = [], files = [];
    for await (const entry of handle.values()) {
        if (entry.kind === 'directory') folders.push(entry);
        else files.push(entry);
    }
    folders.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    for (const folder of folders) {
        const fullPath = prefix ? `${prefix}/${folder.name}` : folder.name;
        const { li, subList } = makeFolderItem(folder.name, depth);
        container.appendChild(li);
        container.appendChild(subList);
        await renderDir(folder, subList, depth + 1, fullPath);
    }

    for (const file of files) {
        const fullPath = prefix ? `${prefix}/${file.name}` : file.name;
        fileHandles[fullPath] = file;
        container.appendChild(makeFileItem(file.name, fullPath, depth));
    }
}

function makeFolderItem(name, depth) {
    const li = document.createElement('li');
    li.className = 'folder-item';
    li.style.paddingLeft = `${6 + depth * 12}px`;
    li.innerHTML = `
        <svg class="chevron" width="12" height="12" viewBox="0 0 16 16" style="fill:#ccc;flex-shrink:0;transition:transform 0.1s;transform:rotate(90deg)">
            <path d="M6 4l4 4-4 4V4z"/>
        </svg>
        <svg width="14" height="14" viewBox="0 0 16 16" style="fill:#e8c000;flex-shrink:0">
            <path d="M14.5 3H7.71l-.85-.85L6.51 2h-5l-.5.5v11l.5.5h13l.5-.5v-10L14.5 3zm-1 10h-11V7h11v6zm0-7h-11V3h4.29l.86.85.35.15H13.5v2z"/>
        </svg>
        <span>${name}</span>`;

    const subList = document.createElement('ul');
    subList.style.cssText = 'list-style:none;padding:0;margin:0;';

    let open = true;
    li.addEventListener('click', (e) => {
        e.stopPropagation();
        open = !open;
        subList.style.display = open ? '' : 'none';
        li.querySelector('.chevron').style.transform = open ? 'rotate(90deg)' : 'rotate(0deg)';
    });

    return { li, subList };
}

function makeFileItem(displayName, fullPath, depth) {
    const ext = displayName.split('.').pop().toLowerCase();
    const li = document.createElement('li');
    li.id = `file-item-${CSS.escape(fullPath)}`;
    li.style.paddingLeft = `${20 + depth * 12}px`;
    li.innerHTML = `${getFileIcon(ext)}<span>${displayName}</span>`;
    li.addEventListener('click', () => openFile(fullPath));
    return li;
}

function getFileIcon(ext) {
    const colors = {
        js: '#e8d44d', ts: '#007acc', html: '#e44d26', css: '#264de4',
        py: '#3572A5', json: '#cbcb41', md: '#519aba', sql: '#e38c00',
        sh: '#4eaa25', yml: '#cb171e', yaml: '#cb171e',
    };
    const color = colors[ext] || '#ccc';
    return `<svg width="14" height="14" viewBox="0 0 16 16" style="fill:${color};flex-shrink:0">
        <path d="M9.5 1.1l3.4 3.5.1.4v9l-.5.5h-9l-.5-.5v-13l.5-.5h6.7l.3.1zM10 2v2h1.9L10 2zm2.5 11V5H9.5L9 4.5V1H4v12h8.5z"/>
    </svg>`;
}

function setActiveFileItem(path) {
    document.querySelectorAll('#file-list li').forEach(li => li.classList.remove('active'));
    if (!path) return;
    const li = document.getElementById(`file-item-${CSS.escape(path)}`);
    if (li) li.classList.add('active');
}

// ── Abrir Arquivo ──
async function openFile(path) {
    if (!editor) return;
    try {
        const fileHandle = fileHandles[path];
        const options = { mode: 'readwrite' };
        if ((await fileHandle.queryPermission(options)) !== 'granted') {
            await fileHandle.requestPermission(options);
        }

        const file = await fileHandle.getFile();
        const content = await file.text();
        const displayName = path.split('/').pop();

        if (!openTabs.find(t => t.path === path)) {
            openTabs.push({ path, displayName, modified: false });
        }

        currentFile = path;
        editor.setValue(content);

        const ext = displayName.split('.').pop().toLowerCase();
        const lang = LANG_MAP[ext] || 'plaintext';
        monaco.editor.setModelLanguage(editor.getModel(), lang);
        document.getElementById('status-language').textContent = LANG_LABEL[lang] || lang;

        unmarkModified(path);
        renderTabs();
        setActiveFileItem(path);
        updateOpenInBrowser(ext);
        updateRunButton(ext);

        document.getElementById('editor').style.display = '';
        document.getElementById('welcome').style.display = 'none';
        editor.focus();
    } catch (err) {
        console.error(err);
    }
}

// ── Abas ──
function renderTabs() {
    const bar = document.getElementById('tabs-scroll');
    bar.innerHTML = '';
    for (const tab of openTabs) {
        const div = document.createElement('div');
        div.className = 'tab' + (tab.path === currentFile ? ' active' : '') + (tab.modified ? ' modified' : '');
        const ext = tab.displayName.split('.').pop().toLowerCase();
        div.innerHTML = `
            ${getFileIcon(ext)}
            <span class="tab-name" title="${tab.path}">${tab.displayName}</span>
            <span class="tab-close">
                <svg width="10" height="10" viewBox="0 0 16 16">
                    <path d="M9.4 8l4.3-4.3-1.4-1.4L8 6.6 3.7 2.3 2.3 3.7 6.6 8l-4.3 4.3 1.4 1.4L8 9.4l4.3 4.3 1.4-1.4z"/>
                </svg>
            </span>`;
        div.addEventListener('click', (e) => {
            if (e.target.closest('.tab-close')) return;
            openFile(tab.path);
        });
        div.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(tab.path);
        });
        bar.appendChild(div);
    }
}

function closeTab(path) {
    const idx = openTabs.findIndex(t => t.path === path);
    if (idx === -1) return;
    openTabs.splice(idx, 1);

    if (currentFile === path) {
        if (openTabs.length > 0) {
            openFile(openTabs[Math.min(idx, openTabs.length - 1)].path);
        } else {
            currentFile = null;
            editor.setValue('');
            document.getElementById('editor').style.display = 'none';
            document.getElementById('welcome').style.display = 'flex';
            document.getElementById('status-language').textContent = 'Texto';
            document.getElementById('status-position').textContent = 'Ln 1, Col 1';
            updateRunButton('');
            updateOpenInBrowser('');
            renderTabs();
            setActiveFileItem(null);
        }
    } else {
        renderTabs();
    }
}

function markModified(path) {
    const tab = openTabs.find(t => t.path === path);
    if (tab && !tab.modified) { tab.modified = true; renderTabs(); }
}

function unmarkModified(path) {
    const tab = openTabs.find(t => t.path === path);
    if (tab) { tab.modified = false; renderTabs(); }
}

// ── Salvar ──
async function saveFile() {
    if (!currentFile || !dirHandle) return;
    try {
        const writable = await fileHandles[currentFile].createWritable();
        await writable.write(editor.getValue());
        await writable.close();
        unmarkModified(currentFile);
        showSaved();
    } catch (err) { console.error(err); }
}

function showSaved() {
    const el = document.getElementById('status-saved');
    el.style.display = 'inline';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.style.display = 'none', 2000);
}

// ── Abrir no Navegador ──
const BROWSER_EXTS = new Set(['html', 'htm', 'svg', 'css', 'js', 'json', 'txt', 'md', 'xml']);
const MIME_MAP = {
    html: 'text/html', htm: 'text/html', svg: 'image/svg+xml',
    css: 'text/css', js: 'text/javascript', json: 'application/json',
    txt: 'text/plain', md: 'text/plain', xml: 'application/xml'
};

function updateOpenInBrowser(ext) {
    document.getElementById('btn-open-browser').style.display =
        BROWSER_EXTS.has(ext) ? 'flex' : 'none';
}

document.getElementById('btn-open-browser').addEventListener('click', () => {
    if (!editor || !currentFile) return;
    const ext = currentFile.split('.').pop().toLowerCase();
    const blob = new Blob([editor.getValue()], { type: MIME_MAP[ext] || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const tab = window.open(url, '_blank');
    if (tab) tab.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
});

// ── Executar ──
const RUNNABLE = { py: 'python', js: 'javascript' };

function updateRunButton(ext) {
    document.getElementById('btn-run').style.display = RUNNABLE[ext] ? 'flex' : 'none';
}

function openTerminal(label) {
    const panel = document.getElementById('terminal-panel');
    const output = document.getElementById('terminal-output');
    panel.style.display = 'flex';
    output.innerHTML = `<span class="out-info">▶ Executando ${escapeHtml(label)}...</span>\n`;
    return output;
}

function setBtnRunning(running) {
    const btn = document.getElementById('btn-run');
    btn.disabled = running;
    btn.innerHTML = running
        ? 'Executando...'
        : `<svg width="12" height="12" viewBox="0 0 16 16" style="fill:#fff"><path d="M4 2l10 6-10 6V2z"/></svg> Executar`;
}

async function runPython() {
    const displayName = currentFile.split('/').pop();
    const output = openTerminal(displayName);
    setBtnRunning(true);
    try {
        const res = await fetch('/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: editor.getValue() })
        });
        const data = await res.json();
        if (data.stdout) output.innerHTML += `<span class="out-stdout">${escapeHtml(data.stdout)}</span>`;
        if (data.stderr) output.innerHTML += `<span class="out-stderr">${escapeHtml(data.stderr)}</span>`;
        if (!data.stdout && !data.stderr) output.innerHTML += `<span class="out-ok">✓ Sem saída.</span>\n`;
        output.innerHTML += `<span class="${data.returncode === 0 ? 'out-ok' : 'out-stderr'}">\nProcesso encerrado com código ${data.returncode}</span>`;
    } catch (err) {
        output.innerHTML += `<span class="out-stderr">Erro ao conectar ao servidor: ${err.message}</span>`;
    }
    setBtnRunning(false);
    output.scrollTop = output.scrollHeight;
}

function runJavaScript() {
    const displayName = currentFile.split('/').pop();
    const output = openTerminal(displayName);
    setBtnRunning(true);

    const logs = [];
    const methods = { log: 'out-stdout', warn: 'out-warn', error: 'out-stderr', info: 'out-info' };
    const originals = {};
    for (const [m, cls] of Object.entries(methods)) {
        originals[m] = console[m];
        console[m] = (...args) => {
            const line = args.map(a => {
                try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
                catch { return String(a); }
            }).join(' ');
            logs.push({ cls, line });
        };
    }

    try {
        new Function(editor.getValue())();
        for (const { cls, line } of logs)
            output.innerHTML += `<span class="${cls}">${escapeHtml(line)}\n</span>`;
        if (!logs.length) output.innerHTML += `<span class="out-ok">✓ Sem saída.</span>\n`;
        output.innerHTML += `<span class="out-ok">\nProcesso encerrado com código 0</span>`;
    } catch (err) {
        for (const { cls, line } of logs)
            output.innerHTML += `<span class="${cls}">${escapeHtml(line)}\n</span>`;
        output.innerHTML += `<span class="out-stderr">${escapeHtml(err.stack || err.message)}</span>`;
        output.innerHTML += `<span class="out-stderr">\nProcesso encerrado com código 1</span>`;
    } finally {
        for (const [m, fn] of Object.entries(originals)) console[m] = fn;
    }

    setBtnRunning(false);
    output.scrollTop = output.scrollHeight;
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.getElementById('btn-run').addEventListener('click', () => {
    if (!editor || !currentFile) return;
    const ext = currentFile.split('.').pop().toLowerCase();
    if (ext === 'py') runPython();
    else if (ext === 'js') runJavaScript();
});

document.getElementById('terminal-close').addEventListener('click', () => {
    document.getElementById('terminal-panel').style.display = 'none';
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'F5' && currentFile) { e.preventDefault(); document.getElementById('btn-run').click(); }
});

// ── Novo Arquivo ──
document.getElementById('btn-new-file').addEventListener('click', async () => {
    const name = prompt('Nome do arquivo (ex: script.js):');
    if (!name) return;
    try {
        const newHandle = await dirHandle.getFileHandle(name, { create: true });
        fileHandles[name] = newHandle;
        const ul = document.getElementById('file-list');
        ul.appendChild(makeFileItem(name, name, 0));
        await openFile(name);
    } catch (err) {
        alert('Erro ao criar arquivo.');
    }
});
