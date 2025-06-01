/**
 * script_IND_DJ.js (updated with console.logs)
 * Loads a single DJ’s profile and ensures each Mixcloud <iframe> uses loading="lazy".
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('📀 script_IND_DJ.js: DOMContentLoaded fired.');

  // 1. Determine DJ ID from query string (?id=).
  const params = new URLSearchParams(window.location.search);
  const djId = params.get('id');
  if (!djId) {
    document.querySelector('.profile-wrapper').innerHTML =
      '<p class="error">Unknown DJ. Please check the link.</p>';
    console.warn('⚠️ No ?id= in URL.');
    return;
  }
  console.log(`📀 Found DJ ID: ${djId}`);

  // 2. Fetch DJ data from JSON (relative path).
  //    Make sure this path actually matches where djs.json lives on your server.
  fetchfetch('djs.json')     // <–– Try removing the leading slash, or adjust as needed
    .then((resp) => {
      console.log('📀 Fetch response status:', resp.status);
      if (!resp.ok) throw new Error(`Failed to load djs.json (status ${resp.status})`);
      return resp.json();
    })
    .then((data) => {
      console.log('📀 JSON data loaded:', data);
      const allDJs = data.djs || [];
      const dj = allDJs.find((d) => d.id === djId);
      if (!dj) {
        document.querySelector('.profile-wrapper').innerHTML =
          '<p class="error">DJ not found. Please check the link.</p>';
        console.warn(`⚠️ DJ with id="${djId}" not found in JSON.`);
        return;
      }
      populateProfile(dj);
    })
    .catch((err) => {
      console.error('❌ Error loading DJ data:', err);
      document.querySelector('.profile-wrapper').innerHTML =
        '<p class="error">Error loading DJ data. Please try again later.</p>';
    });

  // 3. Populate page with DJ details, socials, and mixes
  function populateProfile(dj) {
    console.log('📀 Populating page for DJ:', dj.name);

    // a) Insert Name and Bio
    document.getElementById('dj-name').textContent = dj.name;
    document.getElementById('dj-bio').innerHTML = dj.bioHTML || '';

    // b) Insert Artwork (if any)
    if (dj.artworkUrl) {
      document.getElementById('dj-artwork').src = dj.artworkUrl;
    }

    // c) Build Social Links
    const socialList = document.getElementById('social-links');
    socialList.innerHTML = '';
    if (Array.isArray(dj.socials) && dj.socials.length) {
      dj.socials.forEach((soc) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = soc.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = soc.name;
        li.appendChild(a);
        socialList.appendChild(li);
      });
    } else {
      socialList.innerHTML = '<li>No socials available</li>';
    }

    // d) “Add to Calendar” (if nextEvent exists)
    const calendarBtn = document.getElementById('calendar-btn');
    if (dj.nextEvent) {
      calendarBtn.disabled = false;
      calendarBtn.addEventListener('click', () => {
        const eventDate = new Date(dj.nextEvent);
        const calendarUrl = generateGoogleCalendarLink(
          dj.name + ' Live Set',
          eventDate,
          dj.profileUrl || window.location.href
        );
        window.open(calendarUrl, '_blank');
      });
    }

    // e) Insert Mixcloud mixes
    if (Array.isArray(dj.mixes) && dj.mixes.length) {
      console.log('📀 Found mixes array:', dj.mixes);
      dj.mixes.forEach((mixUrl) => {
        appendMixIframe(mixUrl);
      });
    } else {
      console.log('📀 No mixes array or empty for this DJ.');
      document.getElementById('mixes-list').innerHTML =
        '<p>No mixes available.</p>';
    }
  }

  // 4. Helper: create a Mixcloud <iframe loading="lazy"> + play button
  function appendMixIframe(mixUrl) {
    const mixesContainer = document.getElementById('mixes-list');
    const wrapper = document.createElement('div');
    wrapper.classList.add('mix-show');

    const iframe = document.createElement('iframe');
    iframe.setAttribute('loading', 'lazy'); // ← Lazy load
    // Convert “normal mix URL” → “embed URL”
    iframe.src = mixUrl.endsWith('/')
      ? mixUrl.replace('mixcloud.com/', 'mixcloud.com/embed/') + 'light=1'
      : mixUrl + '/embed/?light=1';
    iframe.width = '100%';
    iframe.height = '60';
    iframe.frameBorder = '0';

    wrapper.appendChild(iframe);
    const btn = document.createElement('button');
    btn.textContent = 'Listen on Mixcloud';
    btn.addEventListener('click', () => window.open(mixUrl, '_blank'));
    wrapper.appendChild(btn);

    mixesContainer.appendChild(wrapper);
  }

  // 5. Add-show Handler (unchanged)
  document.getElementById('add-show-btn').addEventListener('click', () => {
    const input = document.getElementById('mixcloud-url-input');
    const newUrl = input.value.trim();
    if (!newUrl) {
      alert('Please paste a valid Mixcloud URL.');
      return;
    }
    appendMixIframe(newUrl);
    input.value = '';
  });

  // 6. Utility: Google Calendar link generator (unchanged)
  function generateGoogleCalendarLink(title, dateObj, descriptionUrl) {
    const start = formatDateForGCal(dateObj);
    const endDate = new Date(dateObj.getTime() + 2 * 60 * 60 * 1000);
    const end = formatDateForGCal(endDate);
    const text = encodeURIComponent(title);
    const details = encodeURIComponent(
      'Check out ' + title + ' on Cutters Choice Radio: ' + descriptionUrl
    );
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}%2F${end}&details=${details}`;
  }
  function formatDateForGCal(d) {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const HH = String(d.getUTCHours()).padStart(2, '0');
    const MM = String(d.getUTCMinutes()).padStart(2, '0');
    const SS = String(d.getUTCSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}T${HH}${MM}${SS}Z`;
  }
});
