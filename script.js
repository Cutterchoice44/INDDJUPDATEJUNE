/**
 * script_IND_DJ.js
 *
 *  • Reads the “?id=” from the URL
 *  • Loads “djs.json” (from the same directory)
 *  • Finds the matching DJ object inside rawData.djs (array)
 *  • Injects name, bio, artwork, socials, “Add to Calendar” logic, and Mixcloud iframes
 *  • Ensures each iframe uses loading="lazy"
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('📀 script_IND_DJ.js: DOMContentLoaded fired.');

  // 1. Grab ?id=<djId> from the URL
  const params = new URLSearchParams(window.location.search);
  const djId = params.get('id');
  if (!djId) {
    // If there is no ?id= parameter, show an error inside .profile-wrapper
    document.querySelector('.profile-wrapper').innerHTML = 
      '<p class="error">Unknown DJ ID. Please check your link.</p>';
    console.warn('⚠️ No “?id=” found in the URL.');
    return;
  }
  console.log(`📀 Found DJ ID in URL: "${djId}"`);

  // 2. Fetch “djs.json” from the same folder
  fetch('djs.json')
    .then((resp) => {
      console.log('📀 Fetch response status for djs.json:', resp.status);
      if (!resp.ok) throw new Error(`Failed to load djs.json (status ${resp.status})`);
      return resp.json();
    })
    .then((rawData) => {
      // 3. rawData might be either:
      //     a) an Array (e.g. [ {id: …}, {id: …}, … ]), or
      //     b) an Object with a “djs” property (e.g. { "djs": [ {…}, {…} ] })
      let allDJs = [];
      if (Array.isArray(rawData)) {
        allDJs = rawData;
      } else if (Array.isArray(rawData.djs)) {
        allDJs = rawData.djs;
      } else {
        console.warn('⚠️ Unexpected JSON structure: no top-level array or “djs” array found.');
        allDJs = [];
      }

      // 4. Find the DJ object whose “id” matches djId
      const dj = allDJs.find((item) => String(item.id) === String(djId));
      if (!dj) {
        document.querySelector('.profile-wrapper').innerHTML = 
          '<p class="error">DJ not found. Please check the ID.</p>';
        console.warn(`⚠️ No DJ object with id="${djId}" in djs.json.`);
        return;
      }
      console.log('📀 DJ object found:', dj);

      // 5a. Populate “DJ Name” and “Bio”
      const nameEl = document.getElementById('dj-name');
      nameEl.textContent = dj.name || '—';

      const bioEl = document.getElementById('dj-bio');
      // We expect your JSON to have changed “bioHTML” → “bio”
      if (dj.bio) {
        bioEl.innerHTML = dj.bio;
      } else {
        bioEl.innerHTML = '<p>No biography available.</p>';
      }

      // 5b. Populate artwork image
      const artworkImg = document.getElementById('dj-artwork');
      if (dj.artworkUrl) {
        artworkImg.src = dj.artworkUrl;
      } else {
        // Fallback placeholder if no artworkUrl provided
        artworkImg.src = 'https://i.imgur.com/qWOfxOS.png';
      }

      // 5c. Populate social links (<ul id="social-links">)
      const socialList = document.getElementById('social-links');
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
        socialList.innerHTML = '<li>No socials available.</li>';
      }

      // 5d. “Add to Calendar” button logic
      const calendarBtn = document.getElementById('calendar-btn');
      if (dj.nextEvent) {
        calendarBtn.disabled = false;
        calendarBtn.addEventListener('click', () => {
          const eventDate = new Date(dj.nextEvent);
          const calLink = generateGoogleCalendarLink(
            dj.name + ' Live Set',
            eventDate,
            dj.profileUrl || window.location.href
          );
          window.open(calLink, '_blank');
        });
      } else {
        // If no nextEvent provided, keep it disabled
        calendarBtn.disabled = true;
      }

      // 5e. Inject Mixcloud iframes under <div id="mixes-list">
      const mixesContainer = document.getElementById('mixes-list');
      if (Array.isArray(dj.mixes) && dj.mixes.length) {
        console.log('📀 Mixes array found for this DJ:', dj.mixes);
        dj.mixes.forEach((mixUrl) => {
          appendMixIframe(mixUrl, mixesContainer);
        });
      } else {
        mixesContainer.innerHTML = '<p>No mixes available.</p>';
      }
    })
    .catch((err) => {
      console.error('❌ Error loading DJ data:', err);
      document.querySelector('.profile-wrapper').innerHTML =
        '<p class="error">Error loading DJ profile. See console for details.</p>';
    });


  /**
   * Helper: create and append a Mixcloud <iframe loading="lazy"> to mixesContainer.
   *
   * @param {string} mixUrl    – URL to the Mixcloud page (e.g. "https://www.mixcloud.com/artist/show/")
   * @param {HTMLElement} mixesContainer – the <div id="mixes-list">
   */
  function appendMixIframe(mixUrl, mixesContainer) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('mix-show');

    // Create iframe with loading="lazy"
    const iframe = document.createElement('iframe');
    iframe.setAttribute('loading', 'lazy');

    // Convert a standard Mixcloud link into the embed URL form:
    //    If it already ends with '/', replace “mixcloud.com/” → “mixcloud.com/embed/” and add “light=1”
    //    Otherwise, append “/embed/?light=1”
    if (mixUrl.endsWith('/')) {
      iframe.src = mixUrl.replace('mixcloud.com/', 'mixcloud.com/embed/') + 'light=1';
    } else {
      iframe.src = mixUrl + '/embed/?light=1';
    }

    // Fallback if embed URL is malformed:
    if (!iframe.src.includes('mixcloud.com/embed/')) {
      console.warn(`⚠️ Invalid Mixcloud URL: ${mixUrl}`);
      const errMsg = document.createElement('p');
      errMsg.textContent = 'Invalid mix URL.';
      wrapper.appendChild(errMsg);
      mixesContainer.appendChild(wrapper);
      return;
    }

    wrapper.appendChild(iframe);

    // Optional: a “Listen on Mixcloud” button below
    const btn = document.createElement('button');
    btn.textContent = 'Listen on Mixcloud';
    btn.addEventListener('click', () => {
      window.open(mixUrl, '_blank');
    });
    wrapper.appendChild(btn);

    mixesContainer.appendChild(wrapper);
  }


  /**
   * Utility: generate a Google Calendar link for a 2-hour event
   *
   * @param {string} title           – e.g. "ArchieTech Live Set"
   * @param {Date} dateObj           – start date/time in UTC
   * @param {string} descriptionUrl  – typically dj.profileUrl
   * @returns {string} – URL to open Google Calendar event
   */
  function generateGoogleCalendarLink(title, dateObj, descriptionUrl) {
    const pad = (num) => String(num).padStart(2, '0');

    // Start: format YYYYMMDDTHHMMSSZ
    const yyyy = dateObj.getUTCFullYear();
    const mm = pad(dateObj.getUTCMonth() + 1);
    const dd = pad(dateObj.getUTCDate());
    const HH = pad(dateObj.getUTCHours());
    const MM = pad(dateObj.getUTCMinutes());
    const SS = pad(dateObj.getUTCSeconds());
    const start = `${yyyy}${mm}${dd}T${HH}${MM}${SS}Z`;

    // End: 2 hours later
    const endDate = new Date(dateObj.getTime() + 2 * 60 * 60 * 1000);
    const yyyy2 = endDate.getUTCFullYear();
    const mm2 = pad(endDate.getUTCMonth() + 1);
    const dd2 = pad(endDate.getUTCDate());
    const HH2 = pad(endDate.getUTCHours());
    const MM2 = pad(endDate.getUTCMinutes());
    const SS2 = pad(endDate.getUTCSeconds());
    const end = `${yyyy2}${mm2}${dd2}T${HH2}${MM2}${SS2}Z`;

    const text = encodeURIComponent(title);
    const details = encodeURIComponent(
      'Check out ' + title + ' on Cutters Choice Radio: ' + descriptionUrl
    );

    return (
      'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      `&text=${text}` +
      `&dates=${start}%2F${end}` +
      `&details=${details}`
    );
  }
});
