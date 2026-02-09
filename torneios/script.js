const SUPABASE_URL = "https://vllqakohumoinpdwnsqa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbHFha29odW1vaW5wZHduc3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MjIwMTAsImV4cCI6MjA4NjE5ODAxMH0.uXSjwwM_RqeNWJwRQM8We9WEsWsz3C2JfdhlZXNoTKM";

const headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
};

let allDecksOptions = "";

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([loadStores(), loadDecks()]);
    setupDynamicRows();
    setTodayDate();
});

// Define a data de hoje como padrão
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tournamentDate').value = today;
}

// Carrega as Lojas
async function loadStores() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/stores?select=*`, { headers });
        
        if (!res.ok) throw new Error('Error loading stores');
        
        const stores = await res.json();
        const select = document.getElementById("storeSelect");
        
        select.innerHTML = '<option value="">Select store...</option>';
        stores.sort((a, b) => a.name.localeCompare(b.name)).forEach(s => {
            select.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });
    } catch (err) {
        console.error("Error loading stores:", err);
        alert("Error loading stores. Please refresh the page.");
    }
}

// Carrega os Decks
async function loadDecks() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/decks?select=*`, { headers });
        
        if (!res.ok) throw new Error('Error loading decks');
        
        const decks = await res.json();
        
        if (!decks || decks.length === 0) {
            alert("No decks registered! Please add decks before submitting tournament results.");
            return;
        }
        
        allDecksOptions = decks
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(d => `<option value="${d.id}">${d.name}</option>`)
            .join("");
    } catch (err) {
        console.error("Error loading decks:", err);
        alert("Error loading decks. Please refresh the page.");
    }
}

// Lógica Dinâmica de Placements
function setupDynamicRows() {
    const totalPlayersInput = document.getElementById('totalPlayers');
    const container = document.getElementById('placementsContainer');
    const countBadge = document.getElementById('placementsCount');

    totalPlayersInput.addEventListener('input', (e) => {
        const quantity = parseInt(e.target.value) || 0;
        
        // Atualizar badge de contagem
        countBadge.textContent = quantity;
        
        if (quantity === 0) {
            container.innerHTML = `
                <div class="placements-empty">
                    <div class="placements-empty-icon">🎯</div>
                    <p>Enter the total number of players above to add placements</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';

        // Limitar a 16 para não sobrecarregar a interface
        const limit = Math.min(quantity, 16);

        if (quantity > 16) {
            const notice = document.createElement('div');
            notice.style.cssText = 'background: #fff3cd; padding: 12px; border-radius: 8px; margin-bottom: 15px; color: #856404; text-align: center;';
            notice.innerHTML = `⚠️ Showing only top 16. Total players: ${quantity}`;
            container.appendChild(notice);
        }

        for (let i = 1; i <= limit; i++) {
            const row = document.createElement('div');
            row.className = 'placement-row';
            row.innerHTML = `
                <span class="rank-number">${i}</span>
                <select class="deck-select" data-rank="${i}" required>
                    <option value="">Select deck for ${getOrdinal(i)} place...</option>
                    ${allDecksOptions}
                </select>
            `;
            container.appendChild(row);
        }
    });
}

// Helper para ordinais (1st, 2nd, 3rd, etc)
function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Envio do Formulário
document.getElementById('reportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const store_id = document.getElementById('storeSelect').value;
    const date = document.getElementById('tournamentDate').value;
    const total_players = parseInt(document.getElementById('totalPlayers').value);

    // Validações
    if (!store_id) {
        alert("Please select a store!");
        return;
    }

    if (!date) {
        alert("Please select a date!");
        return;
    }

    if (!total_players || total_players < 1) {
        alert("Please enter the total number of players!");
        return;
    }

    const selects = document.querySelectorAll('.deck-select');
    
    // Verificar se todos os decks foram selecionados
    const hasEmptySelects = Array.from(selects).some(sel => !sel.value);
    if (hasEmptySelects) {
        alert("Please select a deck for all placements!");
        return;
    }

    // Montar payload
    const payload = Array.from(selects).map(sel => ({
        store_id: store_id,
        tournament_date: date,
        total_players: total_players,
        placement: parseInt(sel.dataset.rank),
        deck_id: sel.value
    }));

    try {
        showLoading(true);
        
        const res = await fetch(`${SUPABASE_URL}/rest/v1/tournament_results`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showLoading(false);
            alert("✅ Tournament results saved successfully!");
            window.location.href = "../index.html";
        } else {
            const error = await res.json();
            throw error;
        }
    } catch (err) {
        console.error("Error saving:", err);
        showLoading(false);
        alert("❌ Error saving data. Please try again.\n\nDetails: " + (err.message || JSON.stringify(err)));
    }
});

// Loading State
function showLoading(show) {
    const loading = document.getElementById('loading');
    const submitBtn = document.getElementById('submitBtn');
    const form = document.getElementById('reportForm');
    
    if (show) {
        loading.style.display = 'block';
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Saving...';
        form.style.opacity = '0.6';
        form.style.pointerEvents = 'none';
    } else {
        loading.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Save Tournament Results';
        form.style.opacity = '1';
        form.style.pointerEvents = 'auto';
    }
}