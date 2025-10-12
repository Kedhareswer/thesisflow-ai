process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION TRACE:\n' + err.stack);
  process.exit(1);
});
