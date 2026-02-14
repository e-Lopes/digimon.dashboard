const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || 'https://vllqakohumoinpdwnsqa.supabase.co';
const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || '';
const headers = window.createSupabaseHeaders
    ? window.createSupabaseHeaders({ Prefer: 'return=minimal' })
    : {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
      };
let allPlayers = [];
let filteredPlayers = [];
let editingPlayerId = null;
let currentPage = 1;
const PAGE_SIZE_STORAGE_KEY = 'playersPageSize';
const PAGE_SIZE_OPTIONS = [5, 10, 15, 30, 50, 100];
let itemsPerPage = getInitialPageSize();

document.addEventListener('DOMContentLoaded', () => {
    loadPlayers();
    setupEventListeners();
});

function getInitialPageSize() {
    const saved = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
    return PAGE_SIZE_OPTIONS.includes(saved) ? saved : 10;
}
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function setupEventListeners() {
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) {
        pageSizeSelect.value = String(itemsPerPage);
        pageSizeSelect.addEventListener('change', (e) => {
            const selected = Number(e.target.value);
            if (PAGE_SIZE_OPTIONS.includes(selected)) {
                itemsPerPage = selected;
                localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(itemsPerPage));
                currentPage = 1;
                renderPaginatedList();
            }
        });
    }
    document.getElementById('playerForm').addEventListener('submit', handleSubmit);
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        filteredPlayers = allPlayers.filter((p) => p.name.toLowerCase().includes(term));
        currentPage = 1;
        renderPaginatedList();
    });

    document.getElementById('cancelBtn').addEventListener('click', cancelEdit);

    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPaginatedList();
        }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
        if (currentPage < Math.ceil(filteredPlayers.length / itemsPerPage)) {
            currentPage++;
            renderPaginatedList();
        }
    });

    const playersList = document.getElementById('playersList');
    if (playersList) {
        playersList.addEventListener('click', (event) => {
            const editButton = event.target.closest('[data-action="edit-player"]');
            if (editButton) {
                editPlayer(editButton.dataset.playerId, editButton.dataset.playerName || '');
                return;
            }

            const deleteButton = event.target.closest('[data-action="delete-player"]');
            if (deleteButton) {
                deletePlayer(deleteButton.dataset.playerId, deleteButton.dataset.playerName || '');
            }
        });
    }
}

async function loadPlayers() {
    const list = document.getElementById('playersList');
    const loadingNode = list ? list.querySelector('.loading') : null;
    if (window.uiState) {
        window.uiState.setLoading(list, loadingNode, true);
    }

    try {
        const res = window.supabaseApi
            ? await window.supabaseApi.get('/rest/v1/players?select=*&order=name.asc')
            : await fetch(`${SUPABASE_URL}/rest/v1/players?select=*&order=name.asc`, { headers });

        if (!res.ok) {
            throw new Error(`Failed to load players (${res.status})`);
        }

        allPlayers = await res.json();
        filteredPlayers = allPlayers;
        document.getElementById('totalPlayersCount').textContent = allPlayers.length;
        renderPaginatedList();
    } catch (error) {
        console.error(error);
        showToast('Error loading players', 'error');
    } finally {
        if (window.uiState) {
            window.uiState.setLoading(list, loadingNode, false);
        }
    }
}

function renderPaginatedList() {
    const list = document.getElementById('playersList');
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredPlayers.slice(start, start + itemsPerPage);

    list.innerHTML = '';

    if (filteredPlayers.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('paginationControls').style.display = 'none';
        return;
    }

    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('paginationControls').style.display = 'flex';

    paginatedItems.forEach((p) => {
        const item = document.createElement('div');
        item.className = 'player-item';
        item.innerHTML = `
            <span><strong>${p.name}</strong></span>
            <div class="player-actions">
                <button class="btn-action btn-icon-only" type="button" title="Edit player" aria-label="Edit player" data-action="edit-player" data-player-id="${p.id}" data-player-name="${escapeHtmlAttribute(p.name)}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                    </svg>
                </button>
                <button class="btn-action btn-danger btn-icon-only" type="button" title="Delete player" aria-label="Delete player" data-action="delete-player" data-player-id="${p.id}" data-player-name="${escapeHtmlAttribute(p.name)}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M8 6V4h8v2"/>
                        <path d="M19 6l-1 14H6L5 6"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                </button>
            </div>
        `;
        list.appendChild(item);
    });

    const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage) || 1;
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

async function handleSubmit(e) {
    e.preventDefault();
    const nameInput = document.getElementById('playerName');
    const name = nameInput.value.trim();

    const isValidName = window.validation
        ? window.validation.isNonEmptyText(name, 2)
        : name.length >= 2;
    if (!isValidName) {
        showToast('Name must have at least 2 characters.', 'error');
        return;
    }

    const url = editingPlayerId
        ? `${SUPABASE_URL}/rest/v1/players?id=eq.${editingPlayerId}`
        : `${SUPABASE_URL}/rest/v1/players`;
    const method = editingPlayerId ? 'PATCH' : 'POST';

    const res = window.supabaseApi
        ? await window.supabaseApi.request(url.replace(SUPABASE_URL, ''), {
              method,
              headers,
              body: JSON.stringify({ name })
          })
        : await fetch(url, { method, headers, body: JSON.stringify({ name }) });
    if (res.ok) {
        showToast(editingPlayerId ? 'Player updated!' : 'Player added!');
        cancelEdit();
        loadPlayers();
    }
}

function editPlayer(id, name) {
    editingPlayerId = id;
    document.getElementById('playerName').value = name;
    document.getElementById('submitBtn').textContent = 'Update Player';
    document.getElementById('cancelBtn').style.display = 'inline-flex';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
    editingPlayerId = null;
    document.getElementById('playerForm').reset();
    document.getElementById('submitBtn').textContent = '+ Add Player';
    document.getElementById('cancelBtn').style.display = 'none';
}

async function deletePlayer(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    const res = window.supabaseApi
        ? await window.supabaseApi.del(`/rest/v1/players?id=eq.${id}`)
        : await fetch(`${SUPABASE_URL}/rest/v1/players?id=eq.${id}`, { method: 'DELETE', headers });
    if (res.ok) {
        showToast('Removed!');
        loadPlayers();
    }
}

function escapeHtmlAttribute(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
