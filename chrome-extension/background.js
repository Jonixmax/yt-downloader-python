const API = "http://localhost:8090/api";

// Escuchar los mensajes que manda la ventanita (popup)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadVideo") {
    
    // Iniciar la descarga en segundo plano
    startDownloadInBackground(request.url, request.format, request.quality)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, message: error.message }));
      
    return true; // Le dice a Chrome que esperaremos una respuesta asíncrona
  }
});

async function startDownloadInBackground(url, format, quality) { // <--- Agregar parametero
  try {
    const res = await fetch(`${API}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, format, quality }) // <--- Agregar quality aquí
    });

    const data = await res.json();

    if (data.success) {
      // Forzar la descarga en Chrome desde el fondo
      chrome.downloads.download({
        url: data.downloadUrl,
        filename: data.filename
      });
    }
    return data;
  } catch (e) {
    return { success: false, message: "❌ No se pudo conectar con el servidor" };
  }
}