module.exports = {
  apps: [{
    name: 'kokoro-tts-api',
    script: './venv311/bin/python',
    args: 'api_server.py',
    cwd: '/Users/ai_armageddon/builds/Extensions/Chrome-Extensions/Kokoro-Chrome-TTS',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PYTHONPATH: '/Users/ai_armageddon/builds/Extensions/Chrome-Extensions/Kokoro-Chrome-TTS'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    kill_timeout: 5000,
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s',
    // Kill existing process on port before starting
    kill_signal: 'SIGTERM'
  }]
};
