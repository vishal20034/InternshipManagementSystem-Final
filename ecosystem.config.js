module.exports = {
  apps: [
    {
      name: 'internship-portal',
      script: 'server.js',
      exec_mode: 'cluster',
      instances: 'max',
      watch: false,
      time: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};

