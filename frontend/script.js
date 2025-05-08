document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
  
    // Affiche le sablier
    document.getElementById('loader').classList.remove('hidden');
  
    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: formData });
      const data = await response.json();
  
      // Affiche les résultats
      document.getElementById('result').textContent = data.result;
      document.getElementById('loader').classList.add('hidden');
      document.getElementById('download-btn').classList.remove('hidden');
    } catch (err) {
      console.error(err);
    }
  });
  
  // Gestion du bouton de téléchargement
  document.getElementById('download-btn').addEventListener('click', () => {
    const text = document.getElementById('result').textContent;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'conseils_linkedin.txt';
    link.click();
    URL.revokeObjectURL(url);
  });