#!/usr/bin/env python3

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import io
import tempfile
import os
import torch
import soundfile as sf
from kokoro import KPipeline
import uuid
import time
from typing import Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Kokoro TTS API",
    description="Text-to-Speech API using Kokoro model",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your extension's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Kokoro pipelines
pipelines = {}
voices = {
    'a': ['af_heart', 'af_sky', 'af_sarah', 'af_nicole', 'af_sweet', 'am_adam', 'am_michael'],
    'b': ['bf_ema', 'bm_isaac']
}

class TTSRequest(BaseModel):
    text: str
    voice: str = "af_heart"
    speed: float = 1.0
    lang_code: Optional[str] = None
    return_phonemes: bool = False

class TTSResponse(BaseModel):
    success: bool
    message: str
    audio_url: Optional[str] = None
    phonemes: Optional[str] = None
    duration: Optional[float] = None

# Cache for temporary files
temp_files = {}

def get_pipeline(lang_code: str):
    """Get or create pipeline for language"""
    if lang_code not in pipelines:
        logger.info(f"Initializing pipeline for lang_code: {lang_code}")
        pipelines[lang_code] = KPipeline(lang_code=lang_code)
        if lang_code == 'a':
            pipelines[lang_code].g2p.lexicon.golds['kokoro'] = 'kˈOkəɹO'
        elif lang_code == 'b':
            pipelines[lang_code].g2p.lexicon.golds['kokoro'] = 'kˈQkəɹQ'
    return pipelines[lang_code]

def cleanup_old_files():
    """Clean up temporary files older than 1 hour"""
    current_time = time.time()
    files_to_remove = []
    
    for file_id, (file_path, timestamp) in temp_files.items():
        if current_time - timestamp > 3600:  # 1 hour
            if os.path.exists(file_path):
                os.unlink(file_path)
            files_to_remove.append(file_id)
    
    for file_id in files_to_remove:
        del temp_files[file_id]

@app.on_event("startup")
async def startup_event():
    """Initialize pipelines on startup"""
    logger.info("Starting Kokoro TTS API...")
    # Pre-initialize English pipeline
    get_pipeline('a')

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Kokoro TTS API is running",
        "version": "1.0.0",
        "endpoints": {
            "tts": "/tts",
            "voices": "/voices",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "pipelines_loaded": list(pipelines.keys())}

@app.get("/voices")
async def get_voices():
    """Get available voices"""
    return {"voices": voices}

@app.post("/tts", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest, background_tasks: BackgroundTasks):
    """Convert text to speech"""
    try:
        # Validate input
        if not request.text or not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        if len(request.text) > 5000:  # Limit text length
            raise HTTPException(status_code=400, detail="Text too long (max 5000 characters)")
        
        if request.speed < 0.5 or request.speed > 2.0:
            raise HTTPException(status_code=400, detail="Speed must be between 0.5 and 2.0")
        
        # Determine language code from voice if not provided
        if request.lang_code is None:
            request.lang_code = request.voice[0]
        
        if request.lang_code not in voices:
            raise HTTPException(status_code=400, detail=f"Unsupported lang_code: {request.lang_code}")
        
        if request.voice not in voices[request.lang_code]:
            raise HTTPException(status_code=400, detail=f"Voice {request.voice} not available for lang_code {request.lang_code}")
        
        # Get pipeline
        pipeline = get_pipeline(request.lang_code)
        
        # Generate speech
        start_time = time.time()
        generator = pipeline(request.text, voice=request.voice, speed=request.speed)
        
        # Collect audio segments and phonemes
        audio_segments = []
        phoneme_segments = []
        
        for i, (gs, ps, audio) in enumerate(generator):
            audio_segments.append(audio)
            if request.return_phonemes:
                phoneme_segments.append(ps)
        
        if not audio_segments:
            raise HTTPException(status_code=500, detail="Failed to generate audio")
        
        # Combine audio segments
        combined_audio = torch.cat(audio_segments)
        
        # Create temporary file
        file_id = str(uuid.uuid4())
        temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        temp_file.close()
        
        # Save audio
        sf.write(temp_file.name, combined_audio.numpy(), 24000)
        
        # Store file info for cleanup
        temp_files[file_id] = (temp_file.name, time.time())
        
        # Schedule cleanup
        background_tasks.add_task(cleanup_old_files)
        
        # Calculate duration
        duration = len(combined_audio) / 24000  # 24kHz sample rate
        generation_time = time.time() - start_time
        
        phoneme_text = " | ".join(phoneme_segments) if request.return_phonemes and phoneme_segments else None
        
        logger.info(f"Generated speech in {generation_time:.2f}s: {len(request.text)} chars, {duration:.2f}s audio")
        
        return TTSResponse(
            success=True,
            message="Speech generated successfully",
            audio_url=f"/audio/{file_id}",
            phonemes=phoneme_text,
            duration=duration
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating speech: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/audio/{file_id}")
async def get_audio(file_id: str):
    """Serve audio file"""
    if file_id not in temp_files:
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    file_path, timestamp = temp_files[file_id]
    
    if not os.path.exists(file_path):
        del temp_files[file_id]
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    return FileResponse(
        file_path,
        media_type="audio/wav",
        filename=f"kokoro_tts_{file_id}.wav"
    )

@app.delete("/audio/{file_id}")
async def delete_audio(file_id: str):
    """Delete audio file"""
    if file_id not in temp_files:
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    file_path, timestamp = temp_files[file_id]
    
    if os.path.exists(file_path):
        os.unlink(file_path)
    
    del temp_files[file_id]
    
    return {"message": "Audio file deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
