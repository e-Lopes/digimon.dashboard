const SUPABASE_URL = "https://vllqakohumoinpdwnsqa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbHFha29odW1vaW5wZHduc3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MjIwMTAsImV4cCI6MjA4NjE5ODAxMH0.uXSjwwM_RqeNWJwRQM8We9WEsWsz3C2JfdhlZXNoTKM"; // Use a Key completa

const headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
};

let allDecksOptions = ""; // Armazenará o HTML das opções de decks

// 1. Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([loadStores(), loadDecks()]);
    setupDynamicRows();
});

// 2. Carrega as Lojas no Select Principal
async function loadStores() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/stores?select=*`, { headers });
        const stores = await res.json();
        const select = document.getElementById("storeSelect");
        
        select.innerHTML = '<option value="">Select store...</option>';
        stores.sort((a, b) => a.name.localeCompare(b.name)).forEach(s => {
            select.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });
    } catch (err) {
        console.error("Error loading stores:", err);
    }
}

// 3. Carrega os Decks e prepara a string de opções
async function loadDecks() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/decks?select=*`, { headers });
        const decks = await res.json();
        
        // Cria o HTML das options uma única vez para performance
        allDecksOptions = decks
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(d => `<option value="${d.id}">${d.name}</option>`)
            .join("");
    } catch (err) {
        console.error("Error loading decks:", err);
    }
}

// 4. Lógica Dinâmica: Cria linhas de Placements conforme o Total Players
function setupDynamicRows() {
    const totalPlayersInput = document.getElementById('totalPlayers');
    const container = document.getElementById('placementsContainer');

    totalPlayersInput.addEventListener('input', (e) => {
        const quantity = parseInt(e.target.value) || 0;
        container.innerHTML = ''; // Limpa as linhas anteriores

        // Geramos apenas até o Top 16 para manter a interface limpa
        const limit = Math.min(quantity, 16);

        for (let i = 1; i <= limit; i++) {
            const row = document.createElement('div');
            row.className = 'placement-row';
            row.innerHTML = `
                <span class="rank-number">${i}º</span>
                <select class="deck-select" data-rank="${i}" required style="width: 100%; margin: 5px 0; padding: 10px; border-radius: 6px;">
                    <option value="">Select deck for ${i}º place...</option>
                    ${allDecksOptions}
                </select>
            `;
            container.appendChild(row);
        }
    });
}

// 5. Envio dos dados para o Supabase
document.getElementById('reportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const store_id = document.getElementById('storeSelect').value;
    const date = document.getElementById('tournamentDate').value;
    const total_players = parseInt(document.getElementById('totalPlayers').value); // Converte para número

    const selects = document.querySelectorAll('.deck-select');
    const payload = Array.from(selects).map(sel => ({
        store_id: store_id,
        tournament_date: date,
        total_players: total_players, // JSON correto com número
        placement: parseInt(sel.dataset.rank),
        deck_id: sel.value
    }));

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/tournament_results`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Tournament results saved successfully!");
            window.location.href = "../index.html"; // Volta para o Dashboard
        } else {
            const error = await res.json();
            throw error;
        }
    } catch (err) {
        console.error("Error when saving:", err);
        alert("Error saving data. Check console for details.");
    }
});