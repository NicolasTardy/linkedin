const express = require('express');
const fileUpload = require('express-fileupload');
const dotenv = require('dotenv');
const axios = require('axios');
const cors = require('cors');
const Papa = require('papaparse');

dotenv.config({ path: './.env' });

const app = express();
const PORT = process.env.PORT || 3001;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

app.use(cors());
app.use(fileUpload());
app.use(express.json());

// --- Routes API à déclarer avant le static ---

// Route d’optimisation de CV
app.post('/api/analyze', async (req, res) => {
  try {
    const { jobLink } = req.body;
    const files = req.files;
    if (!files.positions || !files.skills || !files.education) {
      return res.status(400).json({ error: 'Positions, Skills et Education sont requis.' });
    }
    const positions = files.positions.data.toString('utf-8');
    const skills    = files.skills.data.toString('utf-8');
    const education = files.education.data.toString('utf-8');
    const prompt = `
Tu es un expert RH. Voici mes données LinkedIn :

🔹 Expérience professionnelle :
${positions}

🔹 Compétences :
${skills}

🔹 Formation :
${education}

🔹 Offre à analyser :
${jobLink}

Structure ta réponse ainsi, **sans** utiliser :
• d’astérisques (*)
• de dièses (#)
• de balises Markdown en général

🔍 Analyse de votre profil vs l'annonce  
🎯 Poste visé : [reprends le titre de l'offre si possible]  

✅ Vos points forts pour ce poste  
🧠 Vos compétences adaptées pour ce poste  
🏆 Vos expériences à mettre en avant pour ce poste  
⚠️ Les points à améliorer ou challenger par rapport à l'annonce  

📌 Proposition de texte “À propos” pour le profil LinkedIn  
🛠️ Conseils pour adapter votre CV à ce poste  

✉️ Une lettre de motivation personnalisée pour ce poste  

⚠️ Important :  
- Style professionnel, synthétique et engageant  
- N’utiliser aucun astérisque, dièse ou balise Markdown  
- Seule la liste avec un emoji puis un espace est autorisée 
`;
    const apiRes = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ],
        stream: false
      },
      {
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json({ result: apiRes.data.choices[0].message.content });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send('Erreur serveur.');
  }
});

// Route d’analyse des connexions
app.post('/api/connections', async (req, res) => {
    try {
      const files = req.files;
      if (!files.connections) {
        return res.status(400).json({ error: 'Le fichier Connections.csv est requis.' });
      }
  
      // 1) Lire tout le contenu
      const raw = files.connections.data.toString('utf-8');
  
      // 2) Diviser en lignes et ignorer les 3 premières
      const lines = raw.split(/\r?\n/);
      const csvContent = lines.slice(3).join('\n');
  
      // 3) Parser le CSV « nettoyé »
      const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
      const rows = parsed.data;
  
      // 4) Vérifier les colonnes
      const required = ['First Name','Last Name','Company','Position'];
      const missing = required.filter(c => !parsed.meta.fields.includes(c));
      if (missing.length) {
        return res.status(400).json({ error: `Colonnes manquantes : ${missing.join(', ')}` });
      }
  
      // 5) Filtrer & compter
      const counts = {};
      const clean = [];
      rows.forEach(r => {
        const fn = r['First Name'].trim();
        const ln = r['Last Name'].trim();
        const co = r['Company'].trim();
        const po = r['Position'].trim();
        if (fn && ln && co) {
          clean.push({ 'First Name': fn, 'Last Name': ln, 'Position': po });
          counts[co] = (counts[co]||0) + 1;
        }
      });
  
      // 6) Obtenir le top 10
      const top10 = Object.entries(counts)
        .sort(([,a],[,b]) => b-a)
        .slice(0,10);
  
      // 7) Répondre
      res.json({
        chart: JSON.stringify(Object.fromEntries(top10)),
        table: JSON.stringify(clean)
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Erreur serveur.');
    }
  });

// --- Maintenant seulement, on sert le frontend statique ---
app.use(express.static('../frontend'));

app.listen(PORT, () => console.log(`✅ Backend en ligne sur le port ${PORT}`));