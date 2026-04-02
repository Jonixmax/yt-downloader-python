import os
import yt_dlp
from fastapi import FastAPI, BackgroundTasks # <--- CAMBIO 1: Agregamos BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# --- CONFIGURACIÓN ---
DOWNLOAD_DIR = "downloads"
PORT = 8090

# Crear carpeta de descargas
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# --- CONFIGURACIÓN DE FASTAPI ---
app = FastAPI(title="Universal Downloader API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class DownloadRequest(BaseModel):
    url: str
    format: str = "mp4"
    quality: str = "best"

# --- LÓGICA UNIVERSAL DE YT-DLP ---
def get_ydl_opts(format_type: str, quality: str = "best"):
    opts = {
        'outtmpl': f'{DOWNLOAD_DIR}/%(title)s.%(ext)s',
        'restrictfilenames': True,
        'noplaylist': True,
        'quiet': True,
        'extractor_args': {'instagram': ['api']} 
    }
    if format_type == 'mp3':
        opts['format'] = 'bestaudio/best'
        opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
        }]
    else:
        if quality == "best":
            # Máxima calidad sin límites
            opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
        else:
            # Filtramos para que la altura (height) no sea mayor a la elegida (1080, 720, etc.)
            opts['format'] = f'bestvideo[ext=mp4,height<={quality}]+bestaudio[ext=m4a]/best[ext=mp4,height<={quality}]/best'
            
        opts['merge_output_format'] = 'mp4'
    return opts

def download_video_sync(url: str, format_type: str, quality: str):
    opts = get_ydl_opts(format_type, quality)
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info)
        if format_type == 'mp3':
            filename = filename.rsplit('.', 1)[0] + '.mp3'
        return os.path.basename(filename)

def get_info_sync(url: str):
    with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
        info = ydl.extract_info(url, download=False)
        # Algunos sitios no devuelven título, ponemos uno por defecto
        return info.get('title', 'Video_Descargado')

# --- ENDPOINTS REST ---
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Universal Downloader API"}

@app.get("/api/info")
def get_info(url: str):
    try:
        title = get_info_sync(url)
        return {"title": title, "url": url}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/download")
def download(req: DownloadRequest):
    try:
        print(f"📥 Solicitud de descarga: {req.url} (Calidad: {req.quality})")
        filename = download_video_sync(req.url, req.format, req.quality)
        dl_url = f"http://localhost:{PORT}/api/file/{filename}"
        return {"success": True, "message": "✅ Descarga completada", "filename": filename, "downloadUrl": dl_url}
    except Exception as e:
        print(f"❌ Error descargando: {str(e)}")
        return {"success": False, "message": f"❌ No se pudo descargar este enlace. Asegúrate de que el video sea público."}


# <--- CAMBIO 2: Función para borrar el archivo de la PC
def remove_file(path: str):
    try:
        os.remove(path)
        print(f"🧹 Archivo temporal eliminado de la PC: {path}")
    except Exception as e:
        print(f"⚠️ No se pudo eliminar el archivo: {e}")

# <--- CAMBIO 3: Modificamos este endpoint para que barra la cocina al terminar
@app.get("/api/file/{filename}")
def serve_file(filename: str, background_tasks: BackgroundTasks):
    file_path = os.path.join(DOWNLOAD_DIR, filename)
    if os.path.exists(file_path):
        background_tasks.add_task(remove_file, file_path)
        return FileResponse(file_path, filename=filename)
    return JSONResponse(status_code=404, content={"message": "Archivo no encontrado"})


# --- ARRANQUE DEL SERVIDOR ---
if __name__ == "__main__":
    import uvicorn
    import multiprocessing
    # Esto es vital para que el .exe funcione correctamente
    multiprocessing.freeze_support() 
    print("🚀 Servidor Universal Downloader iniciado en el puerto 8090...")
    # Quitamos las comillas y el reload=True
    uvicorn.run(app, host="0.0.0.0", port=PORT)