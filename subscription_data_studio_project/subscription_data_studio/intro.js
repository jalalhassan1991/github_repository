(() => {
  'use strict';

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.getElementById('main-nav');

  function closeMenu() {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
    nav.classList.remove('is-open');
  }
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
    nav.classList.toggle('is-open', isOpen);
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuButton.focus();
    }
  });
  window.matchMedia('(min-width: 601px)').addEventListener('change', closeMenu);

  // Filter only the résumé achievements associated with the selected discipline.
  const filters = [...document.querySelectorAll('[data-filter]')];
  const achievements = [...document.querySelectorAll('[data-categories]')];
  const companies = [...document.querySelectorAll('[data-company]')];
  const filterStatus = document.getElementById('filter-status');

  function filterExperience(category) {
    let visible = 0;
    achievements.forEach(item => {
      const matches = category === 'all' || item.dataset.categories.split(' ').includes(
        category);
      item.hidden = !matches;
      if (matches) visible++;
    });
    companies.forEach(company => {
      company.hidden = ![...company.querySelectorAll('[data-categories]')].some(item => !item
        .hidden);
    });
    filters.forEach(button => {
      const selected = button.dataset.filter === category;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    filterStatus.textContent = `Showing ${visible} of ${achievements.length} achievements.`;
  }
  filters.forEach(button => {
    const count = achievements.filter(item => button.dataset.filter === 'all' || item.dataset
      .categories.split(' ').includes(button.dataset.filter)).length;
    button.querySelector('span').textContent = count;
    button.addEventListener('click', () => filterExperience(button.dataset.filter));
  });
  document.querySelectorAll('[data-skill-link]').forEach(link => {
    link.addEventListener('click', () => {
      filterExperience(link.dataset.skillLink);
      filters.find(button => button.dataset.filter === link.dataset.skillLink)?.focus({
        preventScroll: true
      });
    });
  });

  // Preview figures are illustrative synthetic data, separate from the live studio.
  const previews = {
    revenue: {
      labels: ['Active subscribers', '12-month LTV', 'Net retention'],
      values: ['41,208', '$186.40', '92.1%'],
      changes: ['+8.2%', '+12.4%', '+2.8 pts'],
      title: 'Revenue performance',
      subtitle: 'Monthly recurring revenue · Last 8 months',
      legend: 'Revenue',
      current: [43, 48, 46, 57, 64, 70, 74, 82],
      previous: [38, 40, 44, 47, 52, 55, 60, 63],
      min: 20,
      max: 90,
      ticks: [40, 60, 80],
      format: n => `$${n}k`,
      description: 'Illustrative monthly recurring revenue rising from $43,000 in January to $82,000 in August.'
    },
    retention: {
      labels: ['Net retention', 'Repeat subscribers', 'Monthly churn'],
      values: ['92.1%', '37,953', '3.2%'],
      changes: ['+2.8 pts', '+6.4%', '−0.8 pts'],
      title: 'Retention over time',
      subtitle: 'Subscriber retention rate · Last 8 months',
      legend: 'Retention',
      current: [85, 87, 86, 89, 90, 89, 91, 92.1],
      previous: [82, 83, 84, 85, 85.5, 87, 88, 89.3],
      min: 75,
      max: 100,
      ticks: [80, 90, 100],
      format: n => `${n}%`,
      description: 'Illustrative subscriber retention rising from 85% in January to 92.1% in August.'
    },
    cohorts: {
      labels: ['Latest cohort', '12-month LTV', '90-day retention'],
      values: ['5,842', '$186.40', '78.6%'],
      changes: ['+9.3%', '+12.4%', '+4.1 pts'],
      title: 'Cohort lifetime value',
      subtitle: 'Projected 12-month LTV by signup month',
      legend: 'Cohort LTV',
      current: [128, 140, 137, 152, 160, 168, 177, 186.4],
      previous: [115, 122, 130, 135, 143, 151, 159, 165.8],
      min: 90,
      max: 210,
      ticks: [100, 150, 200],
      format: n => `$${n}`,
      description: 'Illustrative projected cohort lifetime value rising from $128 for January signups to $186.40 for August signups.'
    }
  };
  const previewTabs = [...document.querySelectorAll('[data-preview]')];
  const chart = document.getElementById('preview-chart');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

  function drawChart(data) {
    const y = value => 162 - ((value - data.min) / (data.max - data.min)) * 145;
    const x = index => 55 + index * 57;
    const points = values => values.map((value, index) => `${x(index)},${y(value).toFixed(2)}`)
      .join(' ');
    chart.setAttribute('aria-label', data.description);
    chart.innerHTML =
      `<title>${data.title}</title>${data.ticks.map(tick => `<line x1="40" y1="${y(tick)}" x2="467" y2="${y(tick)}" stroke="#e9e3d7" stroke-width=".7"/><text x="30" y="${y(tick) + 3}" text-anchor="end">${data.format(tick)}</text>`).join('')}${data.current.map((value, index) => `<rect x="${x(index) - 12}" y="${y(value)}" width="24" height="${162 - y(value)}" fill="#d7d2c5" rx="1"/>`).join('')}<polyline points="${points(data.previous)}" stroke="#b18b4c" stroke-width="1.5" stroke-dasharray="4 4" fill="none"/><polyline points="${points(data.current)}" stroke="#555348" stroke-width="2" fill="none" stroke-linejoin="round"/>${months.map((month, index) => `<text x="${x(index)}" y="182" text-anchor="middle">${month}</text>`).join('')}`;
  }

  function setPreview(tab) {
    const data = previews[tab.dataset.preview];
    previewTabs.forEach(button => {
      const selected = button === tab;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    document.getElementById('preview-panel').setAttribute('aria-labelledby', tab.id);
    data.labels.forEach((label, index) => {
      document.getElementById(`kpi-label-${index + 1}`).textContent = label;
      document.getElementById(`kpi-value-${index + 1}`).textContent = data.values[index];
      document.getElementById(`kpi-change-${index + 1}`).textContent = data.changes[index];
    });
    document.getElementById('chart-title').textContent = data.title;
    document.getElementById('chart-subtitle').textContent = data.subtitle;
    document.getElementById('legend-current').textContent = data.legend;
    drawChart(data);
  }
  previewTabs.forEach((button, index) => {
    button.addEventListener('click', () => setPreview(button));
    button.addEventListener('keydown', event => {
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % previewTabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + previewTabs.length) %
        previewTabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = previewTabs.length - 1;
      else return;
      event.preventDefault();
      setPreview(previewTabs[nextIndex]);
      previewTabs[nextIndex].focus();
    });
  });
  setPreview(previewTabs[0]);

  if ('IntersectionObserver' in window) {
    const navigationLinks = [...nav.querySelectorAll('a[href^="#"]')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navigationLinks.forEach(link => {
          const current = link.hash === `#${entry.target.id}`;
          link.classList.toggle('current', current);
          if (current) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, {
      rootMargin: '-15% 0px -60% 0px',
      threshold: 0
    });
    navigationLinks.forEach(link => {
      const section = document.querySelector(link.hash);
      if (section) observer.observe(section);
    });
  }
})();
