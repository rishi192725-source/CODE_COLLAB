fetch('https://codecollab-server-nwq8.onrender.com/compile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: "print('hello')", language: "python3" })
}).then(res => res.text()).then(console.log).catch(console.error);
