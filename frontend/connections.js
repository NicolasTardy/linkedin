// Sélection des éléments HTML
const chartCtx = document.getElementById('connections-chart').getContext('2d');
const form = document.getElementById('connections-form');
const loader = document.getElementById('loader');
const downloadChartBtn = document.getElementById('download-chart');
const downloadTableBtn = document.getElementById('download-table');
const positionsTable = document.getElementById('positions-table');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  loader.classList.remove('hidden');
  downloadChartBtn.classList.add('hidden');
  downloadTableBtn.classList.add('hidden');
  positionsTable.innerHTML = '';

  try {
    const formData = new FormData(form);
    const response = await fetch('http://localhost:3001/api/connections', {
      method: 'POST',
      body: formData
    });

    // Si le serveur renvoie une erreur (400, 500…)
    if (!response.ok) {
      // Essaie de lire le JSON d’erreur
      let err = await response.json().catch(() => null);
      loader.classList.add('hidden');
      const msg = err?.error || response.statusText;
      alert(`Erreur serveur : ${msg}`);
      return;
    }

    // Lecture du JSON de réussite
    const { chart, table } = await response.json();

    // Affichage du graphique
    const chartData = JSON.parse(chart);
    const labels = Object.keys(chartData);
    const values = Object.values(chartData);
    new Chart(chartCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Nombre de contacts', data: values }]
      }
    });
    downloadChartBtn.classList.remove('hidden');

    // Affichage du tableau
    const rows = JSON.parse(table);
    positionsTable.innerHTML =
      '<tr><th>First Name</th><th>Last Name</th><th>Position</th></tr>';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r['First Name']}</td>
                      <td>${r['Last Name']}</td>
                      <td>${r['Position']}</td>`;
      positionsTable.appendChild(tr);
    });
    downloadTableBtn.classList.remove('hidden');

  } catch (err) {
    console.error(err);
    alert('Erreur inattendue lors de l’analyse.');
  } finally {
    loader.classList.add('hidden');
  }
});

// Télécharger le graphique
downloadChartBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.href = document.getElementById('connections-chart').toDataURL('image/png');
  link.download = 'connections_chart.png';
  link.click();
});

// Télécharger le tableau
downloadTableBtn.addEventListener('click', () => {
  let csv = 'First Name,Last Name,Position\n';
  document.querySelectorAll('#positions-table tr').forEach((tr, i) => {
    const cols = tr.querySelectorAll('td, th');
    const line = Array.from(cols).map(c => c.textContent).join(',');
    csv += line + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'connections_table.csv';
  a.click();
  URL.revokeObjectURL(url);
});