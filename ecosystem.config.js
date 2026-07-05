module.exports = {
  apps: [
    {
      name: 'basma-api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3099,
        NODE_OPTIONS: '--max-old-space-size=4096',
      },
      max_memory_restart: '4G',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      watch: false,
      kill_timeout: 10000,
      listen_timeout: 8000,
    },
  ],
};
