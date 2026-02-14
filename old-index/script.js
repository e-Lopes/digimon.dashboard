const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || 'https://vllqakohumoinpdwnsqa.supabase.co';
const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || '';
const headers = window.createSupabaseHeaders
    ? window.createSupabaseHeaders()
    : {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
      };

let currentStore = '';
let currentDate = '';
let tournamentDataForCanvas = null;
let selectedBackgroundPath = '../icons/backgrounds/EX11.png';

const TOP_LEFT_LOGO_CANDIDATES = ['../icons/digimon-card-game.png', '../icons/logo.png'];

document.addEventListener('DOMContentLoaded', async () => {
    clearDisplay();
    await loadStores();
    setupEventListeners();
    setupModalActionButtons();
});

function setupEventListeners() {
    const storeFilter = document.getElementById('storeFilter');
    const dateFilter = document.getElementById('dateFilter');
    const postBackgroundSelect = document.getElementById('postBackgroundSelect');

    storeFilter.addEventListener('change', async (e) => {
        currentStore = e.target.value;
        if (currentStore) {
            await loadDatesForStore(currentStore);
            dateFilter.disabled = false;
        } else {
            dateFilter.disabled = true;
            dateFilter.innerHTML = '<option value="">Select a date...</option>';
            clearDisplay();
        }
    });

    dateFilter.addEventListener('change', async (e) => {
        currentDate = e.target.value;
        if (currentDate) {
            await displayTournament();
        } else {
            clearDisplay();
        }
    });

    if (postBackgroundSelect) {
        selectedBackgroundPath = postBackgroundSelect.value || '';
        postBackgroundSelect.addEventListener('change', (event) => {
            selectedBackgroundPath = event.target.value || '';
        });
    }
}

async function loadStores() {
    try {
        showLoading(true);
        const res = window.supabaseApi
            ? await window.supabaseApi.get('/rest/v1/stores?select=*')
            : await fetch(`${SUPABASE_URL}/rest/v1/stores?select=*`, {
                  headers,
                  method: 'GET'
              });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const stores = await res.json();
        const select = document.getElementById('storeFilter');

        select.innerHTML = '<option value="">Select store...</option>';
        stores
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach((s) => {
                const option = document.createElement('option');
                option.value = s.id;
                option.textContent = s.name;
                select.appendChild(option);
            });
        showLoading(false);
    } catch (err) {
        console.error('Error loading stores:', err);
        showError();
        showLoading(false);
    }
}

async function loadDatesForStore(storeId) {
    try {
        showLoading(true);
        const res = window.supabaseApi
            ? await window.supabaseApi.get(
                  `/rest/v1/tournament_results?store_id=eq.${storeId}&select=tournament_date,total_players&order=tournament_date.desc`
              )
            : await fetch(
                  `${SUPABASE_URL}/rest/v1/tournament_results?store_id=eq.${storeId}&select=tournament_date,total_players&order=tournament_date.desc`,
                  { headers }
              );

        if (!res.ok) throw new Error('Error loading dates');

        const data = await res.json();
        const dates = [...new Set(data.map((item) => item.tournament_date))];

        const select = document.getElementById('dateFilter');
        select.innerHTML = '<option value="">Select a date...</option>';

        dates.forEach((dateStr) => {
            const option = document.createElement('option');
            option.value = dateStr;

            const [year, month, day] = dateStr.split('-');
            const formattedDate = `${day}/${month}/${year}`;

            option.textContent = formattedDate;
            select.appendChild(option);
        });
        showLoading(false);
    } catch (err) {
        console.error('Error loading dates:', err);
        showError();
        showLoading(false);
    }
}

async function displayTournament() {
    try {
        showLoading(true);

        const resultsPromise = window.supabaseApi
            ? window.supabaseApi.get(
                  `/rest/v1/v_podium_full?store_id=eq.${currentStore}&tournament_date=eq.${currentDate}&order=placement.asc`
              )
            : fetch(
                  `${SUPABASE_URL}/rest/v1/v_podium_full?store_id=eq.${currentStore}&tournament_date=eq.${currentDate}&order=placement.asc`,
                  { headers }
              );

        const tournamentPromise = window.supabaseApi
            ? window.supabaseApi.get(
                  `/rest/v1/tournament?store_id=eq.${currentStore}&tournament_date=eq.${currentDate}&select=tournament_name&order=created_at.desc&limit=1`
              )
            : fetch(
                  `${SUPABASE_URL}/rest/v1/tournament?store_id=eq.${currentStore}&tournament_date=eq.${currentDate}&select=tournament_name&order=created_at.desc&limit=1`,
                  { headers }
              );

        const [resultsRes, tournamentRes] = await Promise.all([resultsPromise, tournamentPromise]);

        if (!resultsRes.ok) throw new Error('Error loading results');
        if (!tournamentRes.ok) throw new Error('Error loading tournament metadata');

        const results = await resultsRes.json();
        const tournamentRows = await tournamentRes.json();
        const tournamentName = tournamentRows?.[0]?.tournament_name || 'SEMANAL';

        if (!results || results.length === 0) {
            clearDisplay();
            showLoading(false);
            return;
        }

        const totalPlayers = results[0].total_players;
        document.getElementById('totalPlayers').textContent = totalPlayers;

        const storeSelect = document.getElementById('storeFilter');
        const storeName = storeSelect.options[storeSelect.selectedIndex].text;

        const [year, month, day] = currentDate.split('-');
        const dateStr = `${day}/${month}/${year}`;

        if (typeof setTournamentDataForCanvas === 'function') {
            setTournamentDataForCanvas({
                topFour: results.slice(0, 4),
                storeName: storeName,
                tournamentName: tournamentName,
                dateStr: dateStr,
                totalPlayers: totalPlayers,
                allResults: results
            });
        }

        displayPodium(results.slice(0, 4));
        displayPositions(results);

        // Mostrar seÃ§Ã£o de resultados completos quando hÃ¡ dados
        const positionsSection = document.querySelector('.positions-section');
        if (positionsSection) {
            positionsSection.style.display = 'block';
        }

        showLoading(false);
    } catch (err) {
        console.error('Error displaying tournament:', err);
        showError();
        showLoading(false);
    }
}

function displayPodium(topFour) {
    const positions = [
        { id: 'firstPlace', placement: 1 },
        { id: 'secondPlace', placement: 2 },
        { id: 'thirdPlace', placement: 3 },
        { id: 'fourthPlace', placement: 4 }
    ];

    positions.forEach((pos) => {
        const card = document.getElementById(pos.id);
        const entry = topFour.find((e) => e.placement === pos.placement);

        if (entry) {
            const img = card.querySelector('.deck-card-image');
            const deckNameEl = card.querySelector('.deck-name');
            const playerNameEl = card.querySelector('.player-name');

            let imageUrl = entry.image_url;

            if (!imageUrl) {
                imageUrl = `https://via.placeholder.com/200x200/667eea/ffffff?text=${encodeURIComponent(entry.deck.substring(0, 10))}`;
            }

            img.src = imageUrl;
            img.alt = entry.deck;

            img.onerror = () => {
                img.src = `https://via.placeholder.com/200x200/667eea/ffffff?text=${encodeURIComponent(entry.deck.substring(0, 10))}`;
            };

            deckNameEl.textContent = entry.deck;

            if (entry.player) {
                playerNameEl.textContent = entry.player;
                playerNameEl.style.display = 'block';
            } else {
                playerNameEl.style.display = 'none';
            }

            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

function displayPositions(results) {
    const container = document.getElementById('positionsList');
    container.innerHTML = '';

    results.forEach((entry) => {
        const div = document.createElement('div');
        div.className = 'position-item';

        if (entry.placement <= 4) {
            div.classList.add(`top-${entry.placement}`);
        }

        div.innerHTML = `
            <div class="position-rank">${entry.placement}º</div>
            <div class="position-content">
                <div class="position-deck">${entry.deck}</div>
                ${entry.player ? `<div class="position-player">${entry.player}</div>` : ''}
            </div>
        `;

        container.appendChild(div);
    });
}

function clearDisplay() {
    document.getElementById('totalPlayers').textContent = '-';

    ['firstPlace', 'secondPlace', 'thirdPlace', 'fourthPlace'].forEach((id) => {
        const card = document.getElementById(id);
        if (card) {
            const img = card.querySelector('.deck-card-image');
            const deckName = card.querySelector('.deck-name');
            const playerName = card.querySelector('.player-name');

            img.src = '';
            img.alt = '';
            deckName.textContent = '-';
            if (playerName) playerName.textContent = '';
            card.style.display = 'none';
        }
    });

    document.getElementById('positionsList').innerHTML = '';

    // Ocultar seÃ§Ã£o de resultados completos quando nÃ£o hÃ¡ dados
    const positionsSection = document.querySelector('.positions-section');
    if (positionsSection) {
        positionsSection.style.display = 'none';
    }

    const generateSection = document.getElementById('generatePostSection');
    if (generateSection) {
        generateSection.style.display = 'none';
    }
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.querySelector('.container').style.opacity = show ? '0.5' : '1';
}

function showError() {
    document.getElementById('errorMessage').style.display = 'block';
}

function setupModalActionButtons() {
    const generatePostBtn = document.getElementById('generatePostBtn');
    const btnPostModalCloseTop = document.getElementById('btnPostModalCloseTop');
    const btnPostDownload = document.getElementById('btnPostDownload');
    const btnPostModalCloseBottom = document.getElementById('btnPostModalCloseBottom');

    if (generatePostBtn) {
        generatePostBtn.addEventListener('click', openPostPreview);
    }
    if (btnPostModalCloseTop) {
        btnPostModalCloseTop.addEventListener('click', closePostPreview);
    }
    if (btnPostDownload) {
        btnPostDownload.addEventListener('click', downloadPost);
    }
    if (btnPostModalCloseBottom) {
        btnPostModalCloseBottom.addEventListener('click', closePostPreview);
    }
}

function setTournamentDataForCanvas(data) {
    tournamentDataForCanvas = data || null;
    const generateSection = document.getElementById('generatePostSection');
    if (generateSection) {
        generateSection.style.display = tournamentDataForCanvas ? 'block' : 'none';
    }
}

function closePostPreview() {
    const modal = document.getElementById('postPreviewModal');
    if (!modal) return;
    modal.classList.add('u-hidden');
}

async function openPostPreview() {
    if (!tournamentDataForCanvas) {
        alert('Load a tournament first.');
        return;
    }

    await drawPostCanvas();
    const modal = document.getElementById('postPreviewModal');
    if (modal) {
        modal.classList.remove('u-hidden');
    }
}

function downloadPost() {
    const canvas = document.getElementById('postCanvas');
    if (!canvas || !tournamentDataForCanvas) return;

    const safeStore = String(tournamentDataForCanvas.storeName || 'store')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const safeDate = String(tournamentDataForCanvas.dateStr || 'date').replace(/[\/\s]+/g, '-');

    const link = document.createElement('a');
    link.download = `digistats-${safeStore}-${safeDate}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

async function drawPostCanvas() {
    const canvas = document.getElementById('postCanvas');
    if (!canvas || !tournamentDataForCanvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (selectedBackgroundPath) {
        const customBg = await loadImage(selectedBackgroundPath);
        if (customBg) {
            drawImageCover(ctx, customBg, 0, 0, width, height);
        } else {
            const bg = ctx.createLinearGradient(0, 0, width, height);
            bg.addColorStop(0, '#2f3a7a');
            bg.addColorStop(1, '#6f47c7');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, width, height);
        }
    } else {
        const bg = ctx.createLinearGradient(0, 0, width, height);
        bg.addColorStop(0, '#2f3a7a');
        bg.addColorStop(1, '#6f47c7');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);
    }

    drawRoundedRect(ctx, 56, 72, width - 112, height - 120, 36, 'rgba(255,255,255,0.88)');

    const logo = await loadFirstAvailableImage(TOP_LEFT_LOGO_CANDIDATES);
    if (logo) {
        drawImageContain(ctx, logo, 96, 86, 520, 182);
    }

    const rightTextX = width - 98;
    const tournamentTitle = String(
        tournamentDataForCanvas.tournamentName || 'SEMANAL'
    ).toUpperCase();
    ctx.fillStyle = '#184fae';
    ctx.font = '700 76px "Zing Rust Base", "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(tournamentTitle.slice(0, 14), rightTextX, 160);

    ctx.fillStyle = '#ff3959';
    ctx.font = '700 58px "Zing Rust Base", "Segoe UI", sans-serif';
    ctx.fillText(tournamentDataForCanvas.dateStr || '--/--/--', rightTextX - 14, 228);

    const rows = (tournamentDataForCanvas.topFour || []).slice(0, 4);
    const startY = 280;
    const rowHeight = 178;
    const rowGap = 24;
    for (let i = 0; i < 4; i += 1) {
        const y = startY + i * (rowHeight + rowGap);
        await drawPlacementRow(ctx, i + 1, y, rowHeight, rows[i] || null);
    }

    const footerY = height - 154;
    const storeBoxX = 96;
    const storeBoxY = footerY;
    const storeBoxW = 360;
    const storeBoxH = 96;
    drawRoundedRect(ctx, storeBoxX, storeBoxY, storeBoxW, storeBoxH, 18, '#0a2f6d');
    const storeIconPath = resolveStoreIconPath(tournamentDataForCanvas.storeName || '');
    const storeIcon = await loadImage(storeIconPath);
    if (storeIcon) {
        drawImageContain(
            ctx,
            storeIcon,
            storeBoxX + 18,
            storeBoxY + 12,
            storeBoxW - 36,
            storeBoxH - 24
        );
    }

    ctx.fillStyle = '#184fae';
    ctx.font = 'bold 50px Segoe UI';
    ctx.textAlign = 'right';
    ctx.fillText('@digimoncwb', width - 92, footerY + 64);
}

async function drawPlacementRow(ctx, placement, y, rowHeight, entry) {
    const styles = {
        1: { border: '#c99a2e', medal: '#f1c451' },
        2: { border: '#9497a1', medal: '#c2c4ca' },
        3: { border: '#a85d2f', medal: '#d88b44' },
        4: { border: '#4dbf9f', medal: '#59d1af' }
    };
    const style = styles[placement] || styles[4];

    const rowX = 92;
    const rowW = 896;
    drawRoundedRect(ctx, rowX, y, rowW, rowHeight, 26, '#f3f3f6', style.border, 6);

    ctx.fillStyle = style.medal;
    ctx.beginPath();
    ctx.arc(rowX + 74, y + rowHeight / 2, 52, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#111';
    ctx.font = 'bold 62px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(`${placement}º`, rowX + 74, y + rowHeight / 2 + 20);

    ctx.fillStyle = '#1e4f95';
    ctx.textAlign = 'left';
    ctx.font = 'bold 54px Segoe UI';
    ctx.fillText((entry?.player || 'PLAYER').toUpperCase().slice(0, 18), rowX + 168, y + 78);

    ctx.font = 'bold 62px Segoe UI';
    ctx.fillText((entry?.deck || 'DECK').toUpperCase().slice(0, 14), rowX + 168, y + 146);

    const avatarX = rowX + rowW - 95;
    const avatarY = y + rowHeight / 2;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, 74, 0, Math.PI * 2);
    ctx.fillStyle = '#ddd';
    ctx.fill();

    const image = entry?.image_url ? await loadImage(entry.image_url) : null;
    if (image) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, 70, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(image, avatarX - 70, avatarY - 70, 140, 140);
        ctx.restore();
    }

    ctx.lineWidth = 6;
    ctx.strokeStyle = style.border;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, 72, 0, Math.PI * 2);
    ctx.stroke();
}

function drawRoundedRect(ctx, x, y, w, h, r, fill, stroke, strokeWidth) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    ctx.fillStyle = fill;
    ctx.fill();

    if (stroke) {
        ctx.lineWidth = strokeWidth || 2;
        ctx.strokeStyle = stroke;
        ctx.stroke();
    }
}

function loadImage(src) {
    return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
    });
}

function normalizeStoreName(name) {
    return String(name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function resolveStoreIconPath(storeName) {
    const normalized = normalizeStoreName(storeName);
    if (normalized.includes('gladiator')) return '../icons/stores/Gladiators.png';
    if (normalized.includes('meruru')) return '../icons/stores/Meruru.svg';
    if (normalized.includes('taverna')) return '../icons/stores/Taverna.png';
    if (normalized.includes('tcgbr') || normalized.includes('tcg br'))
        return '../icons/stores/TCGBR.png';
    return '../icons/stores/images.png';
}

async function loadFirstAvailableImage(candidates) {
    for (const candidate of candidates) {
        const image = await loadImage(candidate);
        if (image) return image;
    }
    return null;
}

function drawImageCover(ctx, image, x, y, width, height) {
    const scale = Math.max(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const dx = x + (width - drawWidth) / 2;
    const dy = y + (height - drawHeight) / 2;
    ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
}

function drawImageContain(ctx, image, x, y, width, height) {
    const scale = Math.min(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const dx = x + (width - drawWidth) / 2;
    const dy = y + (height - drawHeight) / 2;
    ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
}

