/**
 * script_IND_DJ.js  (fixed “fetchfetch” → “fetch”)
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
  fetch('djs.json')                    // ← FIXED: was “fetchfetch(…)” by mistake
    .then((resp) => {
      console.log('📀 Fetch response status:', resp.status);
      if (!resp.ok) throw new Error(`Failed to load djs.json (status ${resp.status})`);
      return resp.json();
    })
    .then((allDJs) => {
      // 3. Find the single DJ object whose “id” matches djId:
      const dj = allDJs.find((item) => String(item.id) === String(djId));
      if (!dj) {
        document.querySelector('.profile-wrapper').innerHTML =
          '<p class="error">DJ not found. Please check the link.</p>';
        console.warn(`⚠️ No DJ matching id=${djId}`);
        return;
      }

      // a) Populate name & bio
      document.getElementById('dj-name').textContent = dj.name || '—';
      const bioDiv = document.getElementById('dj-bio');
      bioDiv.innerHTML = dj.bio
        ? dj.bio
        : '<p>No biography available.</p>';

      // b) Populate artwork
      const artEl = document.getElementById('dj-artwork');
      if (dj.artworkUrl) {
        artEl.src = dj.artworkUrl;
      } else {
        artEl.src = 'https://i.imgur.com/qWOfxOS.png'; // placeholder
      }

      // c) Social links
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
        // If there are no mixes listed in djs.json, you can show a placeholder:
        const mixesContainer = document.getElementById('mixes-list');
        mixesContainer.innerHTML = '<p>No mixes available.</p>';
      }
    })
    .catch((err) => {
      console.error('❌ Error loading DJ data:', err);
      const e = document.querySelector('.profile-wrapper');
      e.innerHTML = '<p class="error">Error loading DJ profile. Check console for details.</p>';
    });


  // 4. Helper: create a Mixcloud <iframe loading="lazy"> + play button
  function appendMixIframe(mixUrl) {
    const mixesContainer = document.getElementById('mixes-list');
    const wrapper = document.createElement('div');
    wrapper.classList.add('mix-show');

    // Create the actual <iframe> and force lazy loading
    const iframe = document.createElement('iframe');
    iframe.setAttribute('loading', 'lazy'); // ← Lazy load as requested

    // Turn a “normal” Mixcloud link into its embed URL form:
    //   * If it already ends with a slash, replace “mixcloud.com/” → “mixcloud.com/embed/” and append “?light=1”
    //   * Otherwise, just tack “/embed/?light=1” onto the end.
    if (mixUrl.endsWith('/')) {
      iframe.src = mixUrl.replace('mixcloud.com/', 'mixcloud.com/embed/') + 'light=1';
    } else {
      iframe.src = mixUrl + '/embed/?light=1';
    }

    // Fallback: in case the URL is malformed or missing “mixcloud.com/…”:
    if (!iframe.src.includes('mixcloud.com/embed/')) {
      console.warn(`⚠️ Invalid Mixcloud URL: ${mixUrl}`);
      const errMsg = document.createElement('p');
      errMsg.textContent = 'Invalid mix URL.';
      wrapper.appendChild(errMsg);
      mixesContainer.appendChild(wrapper);
      return;
    }

    // Add the iframe to the page
    wrapper.appendChild(iframe);

    // (Optional) A “Listen on Mixcloud” link underneath:
    const btn = document.createElement('button');
    btn.textContent = 'Listen on Mixcloud';
    btn.addEventListener('click', () => {
      window.open(mixUrl, '_blank');
    });
    wrapper.appendChild(btn);

    mixesContainer.appendChild(wrapper);
  }


  // 5. Utility: Google Calendar link generator (unchanged)
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
