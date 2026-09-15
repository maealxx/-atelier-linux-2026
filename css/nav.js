(function() {
  // ── Remonter author et date dans le bandeau titre ──
  const title = document.querySelector('h1.title');
  const author = document.querySelector('p.author');
  const date = document.querySelector('p.date');

  if (title && author) title.insertAdjacentElement('afterend', author);
  if (author && date)  author.insertAdjacentElement('afterend', date);

  // ── Barre de navigation ──
  const bar = document.createElement('div');
  bar.id = 'nav-bar';

  const home = document.createElement('a');
  home.href = '../index.html';
  home.textContent = '← Accueil';
  bar.appendChild(home);

  const md = document.createElement('a');
  const name = location.pathname.split('/').pop().replace('.html', '.org');
  md.href = './' + name;
  md.textContent = '⬇ .org';
  bar.appendChild(md);

  const toggle = document.createElement('button');
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
    toggle.textContent = '☀ Jour';
  } else {
    toggle.textContent = '☾ Nuit';
  }
  toggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    toggle.textContent = isDark ? '☀ Jour' : '☾ Nuit';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
  bar.appendChild(toggle);

  document.body.appendChild(bar);
})();