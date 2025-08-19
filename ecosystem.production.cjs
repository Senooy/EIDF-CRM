module.exports = {
  apps: [
    {
      name: 'eidf-backend-prod',
      script: 'server.ts',
      interpreter: 'tsx',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/backend-prod-error.log',
      out_file: './logs/backend-prod-out.log',
      merge_logs: true,
      time: true
    },
    {
      name: 'eidf-frontend-prod',
      script: 'npm',
      args: 'run preview',
      env: {
        NODE_ENV: 'production',
        PORT: 4173
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/frontend-prod-error.log',
      out_file: './logs/frontend-prod-out.log',
      merge_logs: true,
      time: true
    }
  ]
};