module.exports = {
  apps: [
    {
      name: 'icpchue-server',
      script: './server/index.js',
      cwd: '/root/ICPCHUE',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/root/ICPCHUE/logs/pm2-error.log',
      out_file: '/root/ICPCHUE/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log']
    }
  ]
};

