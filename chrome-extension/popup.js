const API = "http://localhost:8090/api";

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fmt-mp4').addEventListener('click', () => setFormat('mp4'));
  document.getElementById('fmt-mp3').addEventListener('click', () => setFormat('mp3'));
  document.getElementById('btn-download').addEventListener('click', startDownload);
});
let currentUrl = "";
let selectedFormat = "mp4";

function setFormat(fmt) {
  selectedFormat = fmt;
  document.getElementById('fmt-mp4').className = 'fmt-btn' + (fmt === 'mp4' ? ' active' : '');
  document.getElementById('fmt-mp3').className = 'fmt-btn' + (fmt === 'mp3' ? ' active' : '');
}

function setStatus(msg, type = '') {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = type;
}

// Obtener URL de la pestaña activa (SIN restricción de YouTube)
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  const tab = tabs[0];
  const url = tab.url || "";
  currentUrl = url;

  const urlBox = document.getElementById('url-box');
  
  // Lista de sitios soportados comunes (para dar retroalimentación visual)
  const isSupported = url.includes("youtube") || url.includes("youtu.be") || 
                      url.includes("instagram.com/reel") || url.includes("facebook.com") || 
                      url.includes("tiktok.com") || url.includes("twitter.com") || url.includes("x.com");

  if (isSupported || url.startsWith("http")) {
    urlBox.textContent = url;
    urlBox.style.color = '#4afa72';

    // Intentar obtener el título
    try {
      const res = await fetch(`${API}/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.title) {
        document.getElementById('title-box').textContent = `"${data.title}"`;
      }
    } catch (e) {
      // Servidor apagado
    }
  } else {
    urlBox.textContent = "⚠️ Navega a un video primero";
    urlBox.style.color = '#ff4d4d';
    document.getElementById('btn-download').disabled = true;
  }
});

async function startDownload() {
  if (!currentUrl) return;

  const btn = document.getElementById('btn-download');
  const progress = document.getElementById('progress');
  const link = document.getElementById('download-link');

  btn.disabled = true;
  btn.textContent = "Procesando Descarga...";
  progress.style.display = 'block';
  link.style.display = 'none';
  setStatus("Obteniendo la mejor calidad...");

  try {
    const res = await fetch(`${API}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentUrl, format: selectedFormat })
    });

    const data = await res.json();
    progress.style.display = 'none';

    if (data.success) {
      setStatus(`✅ Descarga Lista`, 'ok');
      link.href = data.downloadUrl;
      link.textContent = `📂 Guardar: ${data.filename}`;
      link.style.display = 'block';
      
      // Intentar forzar la descarga automáticamente
      chrome.downloads.download({
        url: data.downloadUrl,
        filename: data.filename
      });
      
      btn.textContent = "⬇ Descargar otro";
    } else {
      setStatus(data.message, 'err');
      btn.textContent = "⬇ Intentar de nuevo";
    }
  } catch (e) {
    progress.style.display = 'none';
    setStatus("❌ No se pudo conectar con el servidor", 'err');
    btn.textContent = "⬇ Descargar";
  }

  btn.disabled = false;
}