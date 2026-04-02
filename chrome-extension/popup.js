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
  
  // Ocultar menú de calidad si es MP3
  document.getElementById('quality-select').style.display = (fmt === 'mp3') ? 'none' : 'block';
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
  btn.textContent = "Procesando en segundo plano...";
  progress.style.display = 'block';
  link.style.display = 'none';
  
  // Nuevo mensaje para el usuario
  setStatus("Puedes cerrar esta pestaña o cambiar de página, la descarga continuará sola.", 'ok');

  // Enviar la orden al background.js
  chrome.runtime.sendMessage({
    action: "downloadVideo",
    url: currentUrl,
    format: selectedFormat,
    quality: document.getElementById('quality-select').value // <--- NUEVA LÍNEA
  }, (response) => {
    // Cuando el servidor termina muy rápido o hay un error inmediato:
    progress.style.display = 'none';
    if (response && response.success) {
      setStatus(`✅ Descarga Lista`, 'ok');
      btn.textContent = "⬇ Descargar otro";
    } else {
      setStatus(response ? response.message : "❌ Error desconocido", 'err');
      btn.textContent = "⬇ Intentar de nuevo";
    }
    btn.disabled = false;
  });
}